import express from "express";

import {
    listAgentDefinitions,
    listProjectAgents,
    getProjectAgent,
    updateProjectAgent,
    provisionProjectAgents,
} from "../controllers/agentController.js";

import { authenticate } from "../middlewares/authMiddleware.js";
import {
    executeTask,
} from "../controllers/agentController.js";

const router = express.Router();

// Global standard agent catalog
router.get(
    "/agent-definitions",
    authenticate,
    listAgentDefinitions
);

// All agents belonging to a project
router.get(
    "/projects/:projectId/agents",
    authenticate,
    listProjectAgents
);

// One project agent
router.get(
    "/project-agents/:projectAgentId",
    authenticate,
    getProjectAgent
);

// Update project-specific configuration
router.patch(
    "/project-agents/:projectAgentId",
    authenticate,
    updateProjectAgent
);

// Provision missing agents for an existing project
router.post(
    "/projects/:projectId/agents/provision",
    authenticate,
    provisionProjectAgents
);

//execute agent task
router.post(
    "/agent-tasks/execute",
    authenticate,
    executeTask
);

export default router;