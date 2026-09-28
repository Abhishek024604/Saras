import { createChannel } from "../services/channelService.js";

export const create = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name } = req.body;

        const channel = await createChannel({
            projectId,
            userId: req.user.id,
            name,
        });

        return res.status(201).json({
            message: "Channel created successfully",
            channel,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};