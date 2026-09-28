import prisma from "../config/db.js";

import {
    provisionProjectAgents,
} from "./projectAgentProvisioningService.js";


const getProjectAccess = async ({
    projectId,
    userId,
}) => {
    const project = await prisma.project.findUnique({
        where: {
            id: projectId,
        },
        select: {
            id: true,
            tenantId: true,
            name: true,
        },
    });

    if (!project) {
        throw new Error("Project not found");
    }

    const membership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId: project.tenantId,
            },
        },
    });

    if (!membership) {
        throw new Error(
            "You are not a member of this organization"
        );
    }

    let projectMembership =
        await prisma.projectMembership.findUnique({
            where: {
                projectId_userId: {
                    projectId,
                    userId,
                },
            },
        });

    if (!projectMembership) {
        projectMembership = await prisma.projectMembership.create({
            data: {
                projectId,
                userId,
            },
        });
    }

    return {
        project,
        membership,
        projectMembership,
    };
};


const requireOrganizationAdmin = (membership) => {
    if (
        membership.role !== "OWNER" &&
        membership.role !== "ADMIN"
    ) {
        throw new Error(
            "Only organization owners and admins can perform this action"
        );
    }
};


export const listAgentDefinitions = async () => {
    return prisma.agentDefinition.findMany({
        orderBy: {
            name: "asc",
        },
    });
};


export const listProjectAgents = async ({
    projectId,
    userId,
}) => {
    await getProjectAccess({
        projectId,
        userId,
    });

    return prisma.projectAgent.findMany({
        where: {
            projectId,
        },
        include: {
            agentDefinition: true,
        },
        orderBy: {
            agentDefinition: {
                name: "asc",
            },
        },
    });
};


export const getProjectAgent = async ({
    projectAgentId,
    userId,
}) => {
    const projectAgent =
        await prisma.projectAgent.findUnique({
            where: {
                id: projectAgentId,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        tenantId: true,
                        name: true,
                    },
                },
                agentDefinition: true,
            },
        });

    if (!projectAgent) {
        throw new Error("Project agent not found");
    }

    await getProjectAccess({
        projectId: projectAgent.project.id,
        userId,
    });

    return projectAgent;
};


export const updateProjectAgent = async ({
    projectAgentId,
    userId,
    displayName,
    modelOverride,
    configuration,
}) => {
    const projectAgent =
        await prisma.projectAgent.findUnique({
            where: {
                id: projectAgentId,
            },
            include: {
                project: {
                    select: {
                        id: true,
                        tenantId: true,
                    },
                },
            },
        });

    if (!projectAgent) {
        throw new Error("Project agent not found");
    }

    const {
        membership,
    } = await getProjectAccess({
        projectId: projectAgent.project.id,
        userId,
    });

    requireOrganizationAdmin(membership);

    const updateData = {};

    if (displayName !== undefined) {
        if (
            displayName !== null &&
            typeof displayName !== "string"
        ) {
            throw new Error(
                "displayName must be a string or null"
            );
        }

        updateData.displayName =
            displayName?.trim() || null;
    }

    if (modelOverride !== undefined) {
        if (
            modelOverride !== null &&
            typeof modelOverride !== "string"
        ) {
            throw new Error(
                "modelOverride must be a string or null"
            );
        }

        updateData.modelOverride =
            modelOverride?.trim() || null;
    }

    if (configuration !== undefined) {
        if (
            configuration !== null ||
            typeof configuration === "object" &&
        !Array.isArray(configuration)
        ) {
            updateData.configuration = configuration;
        } else {
            throw new Error(
                "configuration must be a valid object or null"
            );
        }
    }

    if (Object.keys(updateData).length === 0) {
        throw new Error(
            "At least one field is required to update"
        );
    }

    return prisma.projectAgent.update({
        where: {
            id: projectAgentId,
        },
        data: updateData,
        include: {
            agentDefinition: true,
        },
    });
};


export const provisionAgentsForProject = async ({
    projectId,
    userId,
}) => {
    const {
        membership,
        projectMembership,
    } = await getProjectAccess({
        projectId,
        userId,
    });

    if (
        membership.role !== "OWNER" &&
        membership.role !== "ADMIN" &&
        !projectMembership
    ) {
        throw new Error(
            "Only organization admins or project members can provision agents"
        );
    }

    return provisionProjectAgents({
        projectId,
    });
};