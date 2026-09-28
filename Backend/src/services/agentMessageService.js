import {
    createAgentMessage,
} from "./messageService.js";

import {
    emitToChannel,
} from "../socket/socketEmitter.js";

export const sendAgentMessage = async ({
    projectAgentId,
    channelId,
    content,
}) => {
    const message = await createAgentMessage({
        projectAgentId,
        channelId,
        content,
    });

    emitToChannel(
        channelId,
        "message:new",
        message
    );

    return message;
};