import express from "express";

import { create } from "../controllers/channelController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
    "/:projectId/channels",
    authenticate,
    create
);

export default router;