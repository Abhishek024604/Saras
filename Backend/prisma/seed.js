import prisma from "../src/config/db.js";

const agentDefinitions = [
    {
        name: "Architect Agent",
        slug: "architect",
        role: "Software Architect",
        description:
            "Designs systems and evaluates technical trade-offs.",
        runtimeKey: "architect-runtime",
        defaultModel: "gpt-5.6",
    },
    {
        name: "Developer Agent",
        slug: "developer",
        role: "Software Developer",
        description:
            "Assists with implementation and code-related tasks.",
        runtimeKey: "developer-runtime",
        defaultModel: "gpt-5.6",
    },
    {
        name: "Product Manager Agent",
        slug: "product-manager",
        role: "Product Manager",
        description:
            "Helps define requirements, scope, and product direction.",
        runtimeKey: "product-manager-runtime",
        defaultModel: "gpt-5.6",
    },
    {
        name: "QA Agent",
        slug: "qa",
        role: "Quality Assurance Engineer",
        description:
            "Designs testing strategies and analyzes defects.",
        runtimeKey: "qa-runtime",
        defaultModel: "gpt-5.6",
    },
    {
        name: "Research Agent",
        slug: "research",
        role: "Technical Researcher",
        description:
            "Investigates technologies, approaches, and alternatives.",
        runtimeKey: "research-runtime",
        defaultModel: "gpt-5.6",
    },
    {
        name: "Security Agent",
        slug: "security",
        role: "Security Engineer",
        description:
            "Reviews systems for security risks and vulnerabilities.",
        runtimeKey: "security-runtime",
        defaultModel: "gpt-5.6",
    },
    {
        name: "Project Manager Agent",
        slug: "project-manager",
        role: "Project Manager",
        description:
            "Assists with planning, milestones, and execution tracking.",
        runtimeKey: "project-manager-runtime",
        defaultModel: "gpt-5.6",
    },
];

async function main() {
    for (const agent of agentDefinitions) {
        await prisma.agentDefinition.upsert({
            where: {
                slug: agent.slug,
            },
            update: agent,
            create: agent,
        });
    }

    console.log("Agent definitions seeded successfully");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });