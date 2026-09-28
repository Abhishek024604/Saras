import {
    listAgentDefinitions as listAgentDefinitionsService,
    listProjectAgents as listProjectAgentsService,
    getProjectAgent as getProjectAgentService,
    updateProjectAgent as updateProjectAgentService,
    provisionAgentsForProject,
} from "../services/agentService.js";

import {
    executeAgentTask,
} from "../services/agentExecutionService.js";


export const listAgentDefinitions = async (req, res) => {
    try {
        const definitions =
            await listAgentDefinitionsService();

        return res.status(200).json({
            success: true,
            data: definitions,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


export const listProjectAgents = async (
    req,
    res
) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const projectAgents =
            await listProjectAgentsService({
                projectId,
                userId,
            });

        return res.status(200).json({
            success: true,
            data: projectAgents,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const getProjectAgent = async (
    req,
    res
) => {
    try {
        const { projectAgentId } = req.params;
        const userId = req.user.id;

        const projectAgent =
            await getProjectAgentService({
                projectAgentId,
                userId,
            });

        return res.status(200).json({
            success: true,
            data: projectAgent,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


export const updateProjectAgent = async (
    req,
    res
) => {
    try {
        const { projectAgentId } = req.params;
        const userId = req.user.id;

        const {
            displayName,
            modelOverride,
            configuration,
        } = req.body;

        const updatedAgent =
            await updateProjectAgentService({
                projectAgentId,
                userId,
                displayName,
                modelOverride,
                configuration,
            });

        return res.status(200).json({
            success: true,
            message: "Project agent updated successfully",
            data: updatedAgent,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


export const provisionProjectAgents = async (
    req,
    res
) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;

        const projectAgents =
            await provisionAgentsForProject({
                projectId,
                userId,
            });

        return res.status(200).json({
            success: true,
            message: "Project agents provisioned successfully",
            data: projectAgents,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};


export const executeTask = async (req, res) => {
    try {
        const {
            projectAgentId,
            channelId,
            task,
        } = req.body;

        const result = await executeAgentTask({
            projectAgentId,
            channelId,
            task,
        });

        return res.status(202).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error(
            "Execute agent task error:",
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};