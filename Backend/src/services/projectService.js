import prisma from "../config/db.js";
import {
    provisionProjectAgents,
} from "./projectAgentProvisioningService.js";

const normalizeProjectName = (name) => {
    return name
        .trim()
        .toLowerCase()
        .replace(/^#+/, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
};

export const createProject = async ({
    tenantId,
    userId,
    name,
    description,
}) => {
    if (!name || !name.trim()) {
        throw new Error("Project name is required");
    }

    const normalizedName = normalizeProjectName(name);

    if (!normalizedName) {
        throw new Error("Invalid project name");
    }

    // Verify that the creator belongs to the tenant
    const membership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId,
            },
        },
    });

    if (!membership) {
        throw new Error(
            "You are not a member of this organization"
        );
    }

    const result = await prisma.$transaction(async (tx) => {
        // 1. Check duplicate project name
        const existingProject =
            await tx.project.findUnique({
                where: {
                    tenantId_name: {
                        tenantId,
                        name: normalizedName,
                    },
                },
            });

        if (existingProject) {
            throw new Error(
                "A project with this name already exists"
            );
        }

        // 2. Create project
        const project = await tx.project.create({
            data: {
                name: normalizedName,
                description: description?.trim() || null,
                tenantId,
                createdById: userId,
            },
        });

        // 3. Add creator and all tenant members as project members
        const tenantMembers = await tx.membership.findMany({
            where: { tenantId },
            select: { userId: true },
        });

        let projectMembership = null;
        for (const tm of tenantMembers) {
            const pm = await tx.projectMembership.upsert({
                where: {
                    projectId_userId: {
                        projectId: project.id,
                        userId: tm.userId,
                    },
                },
                update: {},
                create: {
                    projectId: project.id,
                    userId: tm.userId,
                },
            });

            if (tm.userId === userId) {
                projectMembership = pm;
            }
        }

        if (!projectMembership) {
            projectMembership = await tx.projectMembership.upsert({
                where: {
                    projectId_userId: {
                        projectId: project.id,
                        userId,
                    },
                },
                update: {},
                create: {
                    projectId: project.id,
                    userId,
                },
            });
        }

        // 4. Provision standard project agents
        const projectAgents =
            await provisionProjectAgents({
                db: tx,
                projectId: project.id,
            });

        return {
            project,
            projectMembership,
            defaultChannel: null,
            projectAgents,
        };
    });

    return result;
};


export const getTenantProjects = async ({
    tenantId,
    userId,
}) => {
    // Make sure the user belongs to the tenant
    const membership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId,
            },
        },
    });

    if (!membership) {
        throw new Error("You are not a member of this tenant");
    }

    const projects = await prisma.project.findMany({
        where: {
            tenantId,
        },
        select: {
            id: true,
            name: true,
            description: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
            channels: {
                select: {
                    id: true,
                    name: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    // Ensure this tenant member has projectMembership for all projects in this organization
    for (const project of projects) {
        await prisma.projectMembership.upsert({
            where: {
                projectId_userId: {
                    projectId: project.id,
                    userId,
                },
            },
            update: {},
            create: {
                projectId: project.id,
                userId,
            },
        });
    }

    return projects;
};