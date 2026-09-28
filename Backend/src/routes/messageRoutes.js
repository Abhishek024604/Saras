import express from "express";

import {
    create,
    getMessages,
} from "../controllers/messageController.js";

import {
    authenticate,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
    "/:channelId/messages",
    authenticate,
    getMessages
);

router.post(
    "/:channelId/messages",
    authenticate,
    create
);

export default router;