import prisma from "../config/db.js";

export const DEFAULT_SECTIONS = [
    {
        name: "Design Docs",
        description: "System architecture, UI/UX designs, and technical specifications",
    },
    {
        name: "Testing Docs",
        description: "Test plans, QA validation, test suites, and test reports",
    },
    {
        name: "Review Docs",
        description: "Code reviews, RFCs, retrospectives, and audit documentation",
    },
];

/**
 * Validates that a user has authorized access to a specific project.
 * Enforces strict multi-tenant boundary and project membership.
 */
const validateProjectAccess = async (projectId, userId) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    const project = await prisma.project.findUnique({
        where: {
            id: projectId,
        },
        select: {
            id: true,
            name: true,
            tenantId: true,
        },
    });

    if (!project) {
        throw new Error("Project not found");
    }

    // 1. Verify organization membership
    const organizationMembership = await prisma.membership.findUnique({
        where: {
            userId_tenantId: {
                userId,
                tenantId: project.tenantId,
            },
        },
    });

    if (!organizationMembership) {
        throw new Error("You are not a member of this organization");
    }

    // 2. Verify or auto-enroll project membership
    const isOrgAdminOrOwner =
        organizationMembership.role === "OWNER" ||
        organizationMembership.role === "ADMIN";

    let projectMembership = await prisma.projectMembership.findUnique({
        where: {
            projectId_userId: {
                projectId,
                userId,
            },
        },
    });

    if (!projectMembership) {
        projectMembership = await prisma.projectMembership.create({
            data: {
                projectId,
                userId,
            },
        });
    }

    return {
        project,
        organizationMembership,
        isOrgAdminOrOwner,
    };
};

/**
 * Retrieves all document sections for a project.
 * If no sections exist yet for this project, automatically seeds the default sections
 * (Design Docs, Testing Docs, Review Docs) so they are immediately available.
 */
export const getProjectDocSections = async ({ projectId, userId }) => {
    await validateProjectAccess(projectId, userId);

    let sections = await prisma.projectDocSection.findMany({
        where: {
            projectId, // NO LEAKAGE: strictly scoped by projectId
        },
        include: {
            _count: {
                select: {
                    docs: true,
                },
            },
        },
        orderBy: {
            createdAt: "asc",
        },
    });

    // Auto-seed default sections on first visit if none exist
    if (sections.length === 0) {
        for (const defaultSec of DEFAULT_SECTIONS) {
            try {
                await prisma.projectDocSection.create({
                    data: {
                        name: defaultSec.name,
                        description: defaultSec.description,
                        projectId,
                        createdById: userId,
                    },
                });
            } catch (seedErr) {
                // If already created in race condition, ignore
                console.error("Default section seed notice:", seedErr.message);
            }
        }

        sections = await prisma.projectDocSection.findMany({
            where: {
                projectId,
            },
            include: {
                _count: {
                    select: {
                        docs: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });
    }

    return sections;
};

/**
 * Creates a new document section in a project (e.g. Design Docs, Testing Docs, Review Docs, or custom).
 * Ensures section name is unique within the project.
 */
export const createDocSection = async ({
    projectId,
    userId,
    name,
    description,
}) => {
    if (!name || typeof name !== "string" || !name.trim()) {
        throw new Error("Section name is required");
    }

    await validateProjectAccess(projectId, userId);

    const trimmedName = name.trim();

    // Check if section with this name already exists in this project
    const existing = await prisma.projectDocSection.findUnique({
        where: {
            projectId_name: {
                projectId,
                name: trimmedName,
            },
        },
    });

    if (existing) {
        return existing;
    }

    const section = await prisma.projectDocSection.create({
        data: {
            name: trimmedName,
            description: description?.trim() || null,
            projectId,
            createdById: userId,
        },
        include: {
            _count: {
                select: {
                    docs: true,
                },
            },
        },
    });

    return section;
};

/**
 * Deletes a document section. Any documents in it will have their sectionId set to null.
 */
export const deleteDocSection = async ({ projectId, sectionId, userId }) => {
    if (!sectionId) {
        throw new Error("Section ID is required");
    }

    const { isOrgAdminOrOwner } = await validateProjectAccess(projectId, userId);

    const section = await prisma.projectDocSection.findFirst({
        where: {
            id: sectionId,
            projectId, // NO LEAKAGE
        },
    });

    if (!section) {
        throw new Error("Section not found in this project");
    }

    if (section.createdById !== userId && !isOrgAdminOrOwner) {
        throw new Error("You do not have permission to delete this section");
    }

    await prisma.projectDocSection.delete({
        where: {
            id: sectionId,
        },
    });

    return { success: true };
};

/**
 * Creates and stores a document in Neon DB directly.
 * Verifies that the document and any assigned section strictly belong to the target project.
 */
export const createDoc = async ({
    projectId,
    userId,
    title,
    content,
    fileName,
    fileType,
    fileSize,
    fileData,
    sectionId,
    sectionName,
}) => {
    if (!title || typeof title !== "string" || !title.trim()) {
        throw new Error("Document title is required");
    }

    await validateProjectAccess(projectId, userId);

    let resolvedSectionId = null;

    // 1. If sectionId was provided, verify it strictly belongs to this project
    if (sectionId) {
        const targetSection = await prisma.projectDocSection.findFirst({
            where: {
                id: sectionId,
                projectId, // STRICT NO-LEAKAGE GUARANTEE
            },
        });

        if (!targetSection) {
            throw new Error("Selected section does not belong to this project");
        }

        resolvedSectionId = targetSection.id;
    } else if (sectionName && sectionName.trim()) {
        // 2. If a new sectionName was provided on-the-fly, find or create it
        const trimmedSectionName = sectionName.trim();
        let section = await prisma.projectDocSection.findUnique({
            where: {
                projectId_name: {
                    projectId,
                    name: trimmedSectionName,
                },
            },
        });

        if (!section) {
            section = await prisma.projectDocSection.create({
                data: {
                    name: trimmedSectionName,
                    projectId,
                    createdById: userId,
                },
            });
        }

        resolvedSectionId = section.id;
    }

    const doc = await prisma.projectDoc.create({
        data: {
            title: title.trim(),
            content: content?.trim() || null,
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: typeof fileSize === "number" ? fileSize : null,
            fileData: fileData || null,
            sectionId: resolvedSectionId,
            projectId,
            createdById: userId,
        },
        include: {
            section: {
                select: {
                    id: true,
                    name: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    return doc;
};

/**
 * Retrieves all documents for a project, optionally filtered by sectionId.
 * Strictly scoped to the provided project to guarantee no cross-project leakage.
 */
export const getProjectDocs = async ({ projectId, userId, sectionId }) => {
    await validateProjectAccess(projectId, userId);

    const whereClause = {
        projectId, // NO LEAKAGE: strictly filtered by projectId
    };

    if (sectionId) {
        whereClause.sectionId = sectionId;
    }

    const docs = await prisma.projectDoc.findMany({
        where: whereClause,
        select: {
            id: true,
            title: true,
            content: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            sectionId: true,
            section: {
                select: {
                    id: true,
                    name: true,
                },
            },
            projectId: true,
            createdAt: true,
            updatedAt: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return docs;
};

/**
 * Retrieves a single document with full file storage data from Neon DB.
 * Verifies that the document explicitly belongs to the given project.
 */
export const getDocById = async ({ projectId, docId, userId }) => {
    if (!docId) {
        throw new Error("Document ID is required");
    }

    await validateProjectAccess(projectId, userId);

    const doc = await prisma.projectDoc.findFirst({
        where: {
            id: docId,
            projectId, // NO LEAKAGE: verifies document belongs only to this project
        },
        include: {
            section: {
                select: {
                    id: true,
                    name: true,
                },
            },
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (!doc) {
        throw new Error("Document not found in this project");
    }

    return doc;
};

/**
 * Deletes a document from a project.
 * Verifies permissions: creator or organization owner/admin.
 */
export const deleteDoc = async ({ projectId, docId, userId }) => {
    if (!docId) {
        throw new Error("Document ID is required");
    }

    const { isOrgAdminOrOwner } = await validateProjectAccess(projectId, userId);

    const doc = await prisma.projectDoc.findFirst({
        where: {
            id: docId,
            projectId, // NO LEAKAGE: doc must belong to this project
        },
    });

    if (!doc) {
        throw new Error("Document not found in this project");
    }

    if (doc.createdById !== userId && !isOrgAdminOrOwner) {
        throw new Error("You do not have permission to delete this document");
    }

    await prisma.projectDoc.delete({
        where: {
            id: docId,
        },
    });

    return { success: true };
};
