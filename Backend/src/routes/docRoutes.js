import express from "express";
import {
    create,
    list,
    getOne,
    remove,
    listSections,
    createSection,
    removeSection,
} from "../controllers/docController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// =========================
// DOCUMENT SECTIONS
// =========================

router.get(
    "/:projectId/doc-sections",
    authenticate,
    listSections
);

router.post(
    "/:projectId/doc-sections",
    authenticate,
    createSection
);

router.delete(
    "/:projectId/doc-sections/:sectionId",
    authenticate,
    removeSection
);

// =========================
// DOCUMENTS
// =========================

router.post(
    "/:projectId/docs",
    authenticate,
    create
);

router.get(
    "/:projectId/docs",
    authenticate,
    list
);

router.get(
    "/:projectId/docs/:docId",
    authenticate,
    getOne
);

router.delete(
    "/:projectId/docs/:docId",
    authenticate,
    remove
);

export default router;
