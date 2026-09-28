import express from "express"

import { getMyMemberships } from "../controllers/membershipController.js"
import { authenticate } from "../middlewares/authMiddleware.js"

const router = express.Router()

router.get("/", authenticate, getMyMemberships)

export default router