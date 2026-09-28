import prisma from "../config/db.js";

const normalizeChannelName = (name) => {
    return name
        .trim()
        .toLowerCase()
        .replace(/^#+/, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-_]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
};

export const createChannel = async ({
    projectId,
    userId,
    name,
}) => {
    if (!name || typeof name !== "string" || !name.trim()) {
        throw new Error("Channel name is required");
    }

    const normalizedName = normalizeChannelName(name);

    if (!normalizedName) {
        throw new Error("Invalid channel name");
    }

    if (normalizedName === "general") {
        throw new Error(
            "The #general channel is created automatically"
        );
    }

    const project = await prisma.project.findUnique({
        where: {
            id: projectId,
        },
        select: {
            id: true,
            tenantId: true,
        },
    });

    if (!project) {
        throw new Error("Project not found");
    }

    // Verify organization membership and organization-level role.
    const organizationMembership =
        await prisma.membership.findUnique({
            where: {
                userId_tenantId: {
                    userId,
                    tenantId: project.tenantId,
                },
            },
        });

    if (!organizationMembership) {
        throw new Error(
            "You are not a member of this organization"
        );
    }

    if (
        organizationMembership.role !== "OWNER" &&
        organizationMembership.role !== "ADMIN"
    ) {
        throw new Error(
            "Only organization owners and admins can create channels"
        );
    }

    // Verify that the user has access to this project.
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

    const existingChannel = await prisma.channel.findUnique({
        where: {
            projectId_name: {
                projectId,
                name: normalizedName,
            },
        },
    });

    if (existingChannel) {
        throw new Error(
            "A channel with this name already exists in this project"
        );
    }

    const channel = await prisma.channel.create({
        data: {
            name: normalizedName,
            projectId,
        },
    });

    return channel;
};