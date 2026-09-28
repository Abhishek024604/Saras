import express from "express";
import { register, signIn, signOut, refresh, me, registerWithInvitation } from "../controllers/authController.js";
import { authenticate } from "../middlewares/authMiddleware.js"

const router = express.Router();

router.post("/register", register);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/refresh", refresh);
router.get("/me", authenticate, me);
router.post("/register/invitation/:token", registerWithInvitation)

export default router