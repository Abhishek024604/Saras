import { createProject, getTenantProjects, } from "../services/projectService.js"

//ccreate new project
export const create = async (req, res) =>{
    try{
        const { tenantId } = req.params
        const { name, description } = req.body

        const result = await createProject({
            tenantId,
            userId:req.user.id,
            name,
            description
        })
        res.status(201).json({
            message: "Project created successfully",
            project: result.project,
            defaultChannel: result.defaultChannel,
        });
    } catch (error) {
        console.error(error);

        res.status(400).json({
            message: error.message,
        });
    }
}

// list all projects
export const list = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const projects = await getTenantProjects({
            tenantId,
            userId: req.user.id,
        });

        res.status(200).json({
            projects,
        });
    } catch (error) {
        console.error(error);

        res.status(403).json({
            message: error.message,
        });
    }
};