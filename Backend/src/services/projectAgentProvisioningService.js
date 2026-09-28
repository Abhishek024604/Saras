import prisma from "../config/db.js";

export const provisionProjectAgents = async ({
    db = prisma,
    projectId,
}) => {
    const activeDefinitions =
        await db.agentDefinition.findMany();

    if (activeDefinitions.length === 0) {
        return [];
    }

    const projectAgents = await Promise.all(
        activeDefinitions.map((definition) =>
            db.projectAgent.upsert({
                where: {
                    projectId_agentDefinitionId: {
                        projectId,
                        agentDefinitionId: definition.id,
                    },
                },
                update: {},
                create: {
                    projectId,
                    agentDefinitionId: definition.id,
                },
                include: {
                    agentDefinition: true,
                },
            })
        )
    );

    return projectAgents;
};