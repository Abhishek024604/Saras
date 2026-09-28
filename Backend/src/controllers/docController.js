import {
    createDoc,
    getProjectDocs,
    getDocById,
    deleteDoc,
    getProjectDocSections,
    createDocSection,
    deleteDocSection,
} from "../services/docService.js";

// =========================
// DOCUMENT SECTIONS
// =========================

export const listSections = async (req, res) => {
    try {
        const { projectId } = req.params;

        const sections = await getProjectDocSections({
            projectId,
            userId: req.user.id,
        });

        return res.status(200).json({
            sections,
        });
    } catch (error) {
        console.error(error);

        return res.status(403).json({
            message: error.message,
        });
    }
};

export const createSection = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;

        const section = await createDocSection({
            projectId,
            userId: req.user.id,
            name,
            description,
        });

        return res.status(201).json({
            message: "Section created successfully",
            section,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};

export const removeSection = async (req, res) => {
    try {
        const { projectId, sectionId } = req.params;

        const result = await deleteDocSection({
            projectId,
            sectionId,
            userId: req.user.id,
        });

        return res.status(200).json({
            message: "Section deleted successfully",
            result,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};

// =========================
// DOCUMENTS
// =========================

export const create = async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
            title,
            content,
            fileName,
            fileType,
            fileSize,
            fileData,
            sectionId,
            sectionName,
        } = req.body;

        const doc = await createDoc({
            projectId,
            userId: req.user.id,
            title,
            content,
            fileName,
            fileType,
            fileSize,
            fileData,
            sectionId,
            sectionName,
        });

        return res.status(201).json({
            message: "Document created successfully",
            doc,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};

export const list = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { sectionId } = req.query;

        const docs = await getProjectDocs({
            projectId,
            userId: req.user.id,
            sectionId,
        });

        return res.status(200).json({
            docs,
        });
    } catch (error) {
        console.error(error);

        return res.status(403).json({
            message: error.message,
        });
    }
};

export const getOne = async (req, res) => {
    try {
        const { projectId, docId } = req.params;

        const doc = await getDocById({
            projectId,
            docId,
            userId: req.user.id,
        });

        return res.status(200).json({
            doc,
        });
    } catch (error) {
        console.error(error);

        return res.status(404).json({
            message: error.message,
        });
    }
};

export const remove = async (req, res) => {
    try {
        const { projectId, docId } = req.params;

        const result = await deleteDoc({
            projectId,
            docId,
            userId: req.user.id,
        });

        return res.status(200).json({
            message: "Document deleted successfully",
            result,
        });
    } catch (error) {
        console.error(error);

        return res.status(400).json({
            message: error.message,
        });
    }
};
