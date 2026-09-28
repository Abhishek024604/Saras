import prisma from "../config/db.js";

export const authorizeChannelAccess = async ({
    channelId,
    userId,
}) => {
    if (!channelId) {
        throw new Error("Channel ID is required");
    }

    const channel = await prisma.channel.findUnique({
        where: {
            id: channelId,
        },
        select: {
            id: true,
            name: true,
            projectId: true,
            project: {
                select: {
                    id: true,
                    tenantId: true,
                },
            },
        },
    });

    if (!channel) {
        throw new Error("Channel not found");
    }

    const organizationMembership =
        await prisma.membership.findUnique({
            where: {
                userId_tenantId: {
                    userId,
                    tenantId: channel.project.tenantId,
                },
            },
        });

    if (!organizationMembership) {
        throw new Error(
            "You are not a member of this organization"
        );
    }

    let projectMembership =
        await prisma.projectMembership.findUnique({
            where: {
                projectId_userId: {
                    projectId: channel.projectId,
                    userId,
                },
            },
        });

    if (!projectMembership) {
        projectMembership = await prisma.projectMembership.create({
            data: {
                projectId: channel.projectId,
                userId,
            },
        });
    }

    return channel;
};