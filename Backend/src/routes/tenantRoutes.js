import express from "express"

import { create, get } from "../controllers/tenantController.js"
import { authenticate } from "../middlewares/authMiddleware.js"

const router = express.Router();

router.get("/:tenantId", authenticate, get);
router.post("/", authenticate, create);

export default router;