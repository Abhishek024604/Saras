import express from "express";
import {
    create,
    getDetails,
    accept,
    join,
} from "../controllers/invitationController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Create invitation (Owner / Admin)
router.post("/:tenantId/invitations", authenticate, create);

// Inspect invitation details (Public)
router.get("/invitations/:token", getDetails);

// Accept invitation when logged in (Authenticated)
router.post("/invitations/:token/accept", authenticate, accept);

// Join organization via invitation (Public - registers or logs in)
router.post("/invitations/:token/join", join);

export default router;