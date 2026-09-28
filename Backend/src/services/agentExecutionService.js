import prisma from "../config/db.js";

import {
    sendAgentMessage,
} from "./agentMessageService.js";

export const executeAgentTask = async ({
    projectAgentId,
    channelId,
    task,
}) => {
    if (!projectAgentId) {
        throw new Error("Project agent ID is required");
    }

    if (!channelId) {
        throw new Error("Channel ID is required");
    }

    if (
        !task ||
        typeof task !== "string" ||
        !task.trim()
    ) {
        throw new Error("Task is required");
    }

    const projectAgent =
        await prisma.projectAgent.findUnique({
            where: {
                id: projectAgentId,
            },
            include: {
                agentDefinition: true,
                project: true,
            },
        });

    if (!projectAgent) {
        throw new Error("Project agent not found");
    }

    const channel = await prisma.channel.findFirst({
        where: {
            id: channelId,
            projectId: projectAgent.projectId,
        },
        select: {
            id: true,
        },
    });

    if (!channel) {
        throw new Error(
            "Channel does not belong to the agent's project"
        );
    }

    await sendAgentMessage({
        projectAgentId,
        channelId,
        content: `Task received: ${task.trim()}`,
    });

    /*
     * LLM execution will be added here later.
     *
     * Example:
     * const result = await runAgentRuntime({
     *     projectAgent,
     *     task,
     * });
     */

    return {
        projectAgentId,
        channelId,
        status: "QUEUED",
        message: "Agent task accepted",
    };
};