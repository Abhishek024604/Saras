import {
    createMessage,
    getChannelMessages,
} from "../services/messageService.js";

export const create = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { content } = req.body;

        const message = await createMessage({
            channelId,
            userId: req.user.id,
            content,
        });

        return res.status(201).json({
            message: "Message sent successfully",
            data: message,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { limit } = req.query;

        const messages = await getChannelMessages({
            channelId,
            userId: req.user.id,
            limit,
        });

        return res.status(200).json({
            messages,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};