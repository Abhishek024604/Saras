import express from "express"

import { create, list } from "../controllers/projectController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
    "/:tenantId/projects",
    authenticate,
    create
);
router.get(
    "/:tenantId/projects",
    authenticate,
    list
);

export default router;