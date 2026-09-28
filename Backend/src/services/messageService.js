import prisma from "../config/db.js";

const validateMessageContent = (content) => {
    if (
        !content ||
        typeof content !== "string" ||
        !content.trim()
    ) {
        throw new Error("Message content is required");
    }

    const trimmedContent = content.trim();

    if (trimmedContent.length > 5000) {
        throw new Error(
            "Message cannot exceed 5000 characters"
        );
    }

    return trimmedContent;
};

const verifyUserChannelAccess = async ({
    channelId,
    userId,
}) => {
    const channel = await prisma.channel.findUnique({
        where: {
            id: channelId,
        },
        select: {
            id: true,
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

const resolveMessageSender = async (message) => {
    if (message.senderType === "USER") {
        const user = await prisma.user.findUnique({
            where: {
                id: message.senderId,
            },
            select: {
                id: true,
                name: true,
            },
        });

        return {
            id: message.senderId,
            type: "USER",
            name: user?.name ?? "Unknown user",
        };
    }

    if (message.senderType === "AGENT") {
        const projectAgent =
            await prisma.projectAgent.findUnique({
                where: {
                    id: message.senderId,
                },
                select: {
                    id: true,
                    displayName: true,
                    agentDefinition: {
                        select: {
                            name: true,
                        },
                    },
                },
            });

        return {
            id: message.senderId,
            type: "AGENT",
            name:
                projectAgent?.displayName ||
                projectAgent?.agentDefinition?.name ||
                "Unknown agent",
        };
    }

    return {
        id: message.senderId,
        type: message.senderType,
        name: "Unknown sender",
    };
};

const formatMessage = async (message) => {
    const sender = await resolveMessageSender(message);

    return {
        id: message.id,
        content: message.content,
        channelId: message.channelId,
        senderId: message.senderId,
        senderType: message.senderType,
        sender,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
    };
};

export const createMessage = async ({
    channelId,
    senderId,
    senderType = "USER",
    content,
}) => {
    const trimmedContent =
        validateMessageContent(content);

    if (!senderId) {
        throw new Error("Sender ID is required");
    }

    if (!["USER", "AGENT"].includes(senderType)) {
        throw new Error("Invalid sender type");
    }

    const channel = await prisma.channel.findUnique({
        where: {
            id: channelId,
        },
        select: {
            id: true,
            projectId: true,
            project: {
                select: {
                    tenantId: true,
                },
            },
        },
    });

    if (!channel) {
        throw new Error("Channel not found");
    }

    // Human messages must pass membership validation.
    if (senderType === "USER") {
        await verifyUserChannelAccess({
            channelId,
            userId: senderId,
        });
    }

    // Agent messages must belong to this project.
    if (senderType === "AGENT") {
        const projectAgent =
            await prisma.projectAgent.findFirst({
                where: {
                    id: senderId,
                    projectId: channel.projectId,
                },
            });

        if (!projectAgent) {
            throw new Error(
                "Agent does not belong to this project"
            );
        }
    }

    const message = await prisma.message.create({
        data: {
            content: trimmedContent,
            channelId: channel.id,
            senderId,
            senderType,
        },
    });

    return formatMessage(message);
};


export const createAgentMessage = async ({
    projectAgentId,
    channelId,
    content,
}) => {
    if (!projectAgentId) {
        throw new Error("Project agent ID is required");
    }

    const channel = await prisma.channel.findUnique({
        where: {
            id: channelId,
        },
        select: {
            id: true,
            projectId: true,
        },
    });

    if (!channel) {
        throw new Error("Channel not found");
    }

    const projectAgent =
        await prisma.projectAgent.findFirst({
            where: {
                id: projectAgentId,
                projectId: channel.projectId,
            },
        });

    if (!projectAgent) {
        throw new Error(
            "Agent does not belong to this project"
        );
    }

    return createMessage({
        channelId,
        senderId: projectAgentId,
        senderType: "AGENT",
        content,
    });
};

export const getChannelMessages = async ({
    channelId,
    userId,
    limit = 50,
}) => {
    await verifyUserChannelAccess({
        channelId,
        userId,
    });

    const messages = await prisma.message.findMany({
        where: {
            channelId,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: Math.min(Number(limit) || 50, 100),
    });

    const formattedMessages = await Promise.all(
        messages.map(formatMessage)
    );

    return formattedMessages.reverse();
};