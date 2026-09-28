import { useState, useEffect, useCallback, useId } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/api";

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const getFileTypeBadge = (doc) => {
    let ext = "DOC";
    if (doc.fileType?.includes("pdf") || doc.fileName?.endsWith(".pdf")) ext = "PDF";
    else if (doc.fileType?.includes("markdown") || doc.fileName?.endsWith(".md")) ext = "MD";
    else if (doc.fileType?.includes("text") || doc.fileName?.endsWith(".txt")) ext = "TXT";
    else if (doc.fileType?.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.fileName || "")) ext = "IMG";
    else if (doc.fileType?.includes("json") || doc.fileName?.endsWith(".json")) ext = "JSON";

    return {
        label: ext,
        bg: "bg-[#f5f5f5]",
        text: "text-[#4a4a4a]",
        border: "border-[#ddd]",
    };
};

const Docs = ({ project, projectId: propProjectId, tenantId: propTenantId }) => {
    const params = useParams();
    const projectId = propProjectId || params.projectId;
    const _tenantId = propTenantId || params.tenantId;

    const [docs, setDocs] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state for adding a doc
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addTab, setAddTab] = useState("write"); // "write" | "upload"
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [docSectionId, setDocSectionId] = useState("");
    const [isCreatingInlineSection, setIsCreatingInlineSection] = useState(false);
    const [inlineSectionName, setInlineSectionName] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Modal state for adding a section
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState("");
    const [newSectionDesc, setNewSectionDesc] = useState("");
    const [savingSection, setSavingSection] = useState(false);
    const [sectionError, setSectionError] = useState("");

    // Viewer modal / detail view
    const [viewingDoc, setViewingDoc] = useState(null);
    const [loadingDocDetail, setLoadingDocDetail] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const docFileInputId = useId();

    const loadSections = useCallback(async () => {
        if (!projectId) return;
        try {
            const data = await api.getProjectDocSections(projectId);
            const loadedSections = data.sections || [];
            setSections(loadedSections);
            if (loadedSections.length > 0 && !docSectionId) {
                setDocSectionId(loadedSections[0].id);
            }
        } catch (err) {
            console.error("Failed to load doc sections:", err);
        }
    }, [projectId, docSectionId]);

    const loadDocs = useCallback(async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            setError("");
            const data = await api.getProjectDocs(projectId);
            setDocs(data.docs || []);
        } catch (err) {
            setError(err.message || "Failed to load project documents.");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadSections();
    }, [loadSections]);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    const handleOpenAddModal = (initialTab = "write", defaultSection = null) => {
        setAddTab(initialTab);
        setTitle("");
        setContent("");
        setSelectedFile(null);
        setFormError("");
        setIsCreatingInlineSection(false);
        setInlineSectionName("");

        if (defaultSection && defaultSection !== "all") {
            setDocSectionId(defaultSection);
        } else if (selectedSectionId !== "all") {
            setDocSectionId(selectedSectionId);
        } else if (sections.length > 0) {
            setDocSectionId(sections[0].id);
        }

        setIsAddModalOpen(true);
    };

    const handleCloseAddModal = () => {
        if (!saving) {
            setIsAddModalOpen(false);
            setFormError("");
            setIsCreatingInlineSection(false);
        }
    };

    const handleOpenSectionModal = () => {
        setNewSectionName("");
        setNewSectionDesc("");
        setSectionError("");
        setIsSectionModalOpen(true);
    };

    const handleCloseSectionModal = () => {
        if (!savingSection) {
            setIsSectionModalOpen(false);
            setSectionError("");
        }
    };

    const handleCreateSection = async (e) => {
        e.preventDefault();
        const trimmedName = newSectionName.trim();
        if (!trimmedName) {
            setSectionError("Section name is required.");
            return;
        }

        try {
            setSavingSection(true);
            setSectionError("");
            const data = await api.createProjectDocSection(projectId, {
                name: trimmedName,
                description: newSectionDesc.trim() || undefined,
            });

            await loadSections();
            setIsSectionModalOpen(false);
            if (data.section?.id) {
                setSelectedSectionId(data.section.id);
            }
        } catch (err) {
            setSectionError(err.message || "Failed to create section.");
        } finally {
            setSavingSection(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        if (!title.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "");
            setTitle(cleanName);
        }
    };

    const handleCreateDoc = async (e) => {
        e.preventDefault();
        const trimmedTitle = title.trim();

        if (!trimmedTitle) {
            setFormError("Document title is required.");
            return;
        }

        if (isCreatingInlineSection && !inlineSectionName.trim()) {
            setFormError("Please enter a name for the new section.");
            return;
        }

        try {
            setSaving(true);
            setFormError("");

            const payload = {
                title: trimmedTitle,
                sectionId: isCreatingInlineSection ? undefined : (docSectionId || undefined),
                sectionName: isCreatingInlineSection ? inlineSectionName.trim() : undefined,
            };

            if (addTab === "upload") {
                if (!selectedFile) {
                    setFormError("Please select a file to store.");
                    setSaving(false);
                    return;
                }

                const reader = new FileReader();
                const readFilePromise = new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(selectedFile);
                });

                const base64Data = await readFilePromise;

                let extractedText = null;
                if (
                    selectedFile.type.startsWith("text/") ||
                    selectedFile.name.endsWith(".md") ||
                    selectedFile.name.endsWith(".txt") ||
                    selectedFile.name.endsWith(".json")
                ) {
                    try {
                        extractedText = await selectedFile.text();
                    } catch {
                        // ignore text extraction errors
                    }
                }

                payload.content = extractedText;
                payload.fileName = selectedFile.name;
                payload.fileType = selectedFile.type || "application/octet-stream";
                payload.fileSize = selectedFile.size;
                payload.fileData = base64Data;
            } else {
                if (!content.trim()) {
                    setFormError("Please enter document content.");
                    setSaving(false);
                    return;
                }

                payload.content = content.trim();
                payload.fileName = `${trimmedTitle.toLowerCase().replace(/\s+/g, "-")}.md`;
                payload.fileType = "text/markdown";
                payload.fileSize = new Blob([content]).size;
            }

            await api.createProjectDoc(projectId, payload);

            await Promise.all([loadDocs(), loadSections()]);
            setIsAddModalOpen(false);
            setTitle("");
            setContent("");
            setSelectedFile(null);
        } catch (err) {
            setFormError(err.message || "Failed to create document.");
        } finally {
            setSaving(false);
        }
    };

    const handleViewDoc = async (doc) => {
        try {
            setViewingDoc(doc);
            setLoadingDocDetail(true);
            const data = await api.getProjectDoc(projectId, doc.id);
            setViewingDoc(data.doc);
        } catch (err) {
            console.error("Failed to fetch document details:", err);
        } finally {
            setLoadingDocDetail(false);
        }
    };

    const handleDeleteDoc = async (docId, e) => {
        e?.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this document?")) {
            return;
        }

        try {
            setDeletingId(docId);
            await api.deleteProjectDoc(projectId, docId);
            if (viewingDoc?.id === docId) {
                setViewingDoc(null);
            }
            await Promise.all([loadDocs(), loadSections()]);
        } catch (err) {
            alert(err.message || "Failed to delete document.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownloadFile = (doc) => {
        if (!doc.fileData) return;
        const link = document.createElement("a");
        link.href = doc.fileData;
        link.download = doc.fileName || `${doc.title}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredDocs = docs.filter((d) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            d.title.toLowerCase().includes(query) ||
            d.fileName?.toLowerCase().includes(query) ||
            d.content?.toLowerCase().includes(query) ||
            d.section?.name?.toLowerCase().includes(query)
        );
    });

    // Sections to display in the main view
    const sectionsToDisplay =
        selectedSectionId === "all"
            ? sections
            : sections.filter((s) => s.id === selectedSectionId);

    // Documents without a section or whose section is no longer listed
    const uncategorizedDocs = filteredDocs.filter(
        (d) => !d.sectionId || !sections.some((s) => s.id === d.sectionId)
    );

    const activeSectionObj = sections.find((s) => s.id === selectedSectionId);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-white">
            {/* Top Header */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#ddd] bg-white px-5">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#1d1c1d]">Docs</span>
                    <span className="text-xs text-[#616061]">
                        Knowledge Base {project?.name ? `• ${project.name}` : ""}
                    </span>
                    <span className="ml-2 rounded bg-[#f5f5f5] px-2 py-0.5 text-[11px] font-medium text-[#616061] border border-[#ddd]">
                        Database Storage
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleOpenSectionModal}
                        className="rounded border border-[#ddd] bg-white px-2.5 py-1.5 text-xs font-bold text-[#1d1c1d] shadow-sm hover:bg-[#f8f8f8] transition"
                        title="Create a new document section"
                    >
                        + New section
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenAddModal("write")}
                        className="rounded bg-[#007a5a] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#148567] transition"
                    >
                        Write doc
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenAddModal("upload")}
                        className="rounded border border-[#868686] bg-white px-3 py-1.5 text-xs font-bold text-[#1d1c1d] shadow-sm hover:bg-[#f8f8f8] transition"
                    >
                        Upload file
                    </button>
                </div>
            </div>

            {/* Sections Filter Tab Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#eee] bg-[#fafafa] px-5 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#868686] mr-1">
                    Sections:
                </span>

                <button
                    type="button"
                    onClick={() => setSelectedSectionId("all")}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                        selectedSectionId === "all"
                            ? "bg-[#1d1c1d] text-white shadow-sm"
                            : "bg-white text-[#616061] border border-[#ddd] hover:bg-[#f0f0f0]"
                    }`}
                >
                    <span>All Docs</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${selectedSectionId === "all" ? "bg-white/20" : "bg-[#eee]"}`}>
                        {docs.length}
                    </span>
                </button>

                {sections.map((section) => {
                    const isSelected = selectedSectionId === section.id;
                    const docCount = docs.filter((d) => d.sectionId === section.id).length;
                    return (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => setSelectedSectionId(section.id)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                                isSelected
                                    ? "bg-[#1d1c1d] text-white shadow-sm"
                                    : "bg-white text-[#616061] border border-[#ddd] hover:bg-[#f0f0f0]"
                            }`}
                        >
                            <span>{section.name}</span>
                            <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                    isSelected ? "bg-white/20" : "bg-[#eee] text-[#616061]"
                                }`}
                            >
                                {docCount}
                            </span>
                        </button>
                    );
                })}

                <button
                    type="button"
                    onClick={handleOpenSectionModal}
                    className="rounded-full border border-dashed border-[#bbb] bg-white px-2.5 py-1 text-xs font-bold text-[#1264a3] hover:border-[#1264a3] hover:bg-[#f0f8ff] transition whitespace-nowrap"
                >
                    + New section
                </button>
            </div>

            {/* Sub-bar with search */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#eee] bg-white px-5">
                <div className="flex items-center gap-2 text-xs text-[#616061] truncate">
                    {activeSectionObj ? (
                        <>
                            <span className="font-bold text-[#1d1c1d]">{activeSectionObj.name}</span>
                            {activeSectionObj.description && (
                                <span className="hidden sm:inline text-[#868686]">
                                    — {activeSectionObj.description}
                                </span>
                            )}
                        </>
                    ) : (
                        <span>All document sections</span>
                    )}
                </div>

                <div className="w-64 shrink-0">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search docs..."
                        className="h-8 w-full rounded border border-[#ddd] bg-white px-2.5 text-xs outline-none focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                    />
                </div>
            </div>

            {/* Content Area: Sections with Section Name and Docs listed inside */}
            <div className="flex-1 overflow-y-auto p-6">
                {error && (
                    <div className="mb-4 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex h-64 items-center justify-center text-sm text-[#616061]">
                        Loading documents...
                    </div>
                ) : sectionsToDisplay.length === 0 && docs.length === 0 ? (
                    <div className="flex h-80 flex-col items-center justify-center rounded-xl border border-dashed border-[#ddd] bg-[#fcfcfc] p-8 text-center">
                        <h3 className="text-base font-black text-[#1d1c1d]">
                            No documents in this project yet
                        </h3>
                        <p className="mt-1.5 max-w-sm text-xs text-[#616061]">
                            Create sections like Design Docs, Testing Docs, Review Docs, or write/upload documents directly.
                        </p>
                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleOpenAddModal("write")}
                                className="rounded bg-[#007a5a] px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-[#148567]"
                            >
                                Write a doc
                            </button>
                            <button
                                type="button"
                                onClick={() => handleOpenAddModal("upload")}
                                className="rounded border border-[#ddd] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1d1c1d] shadow-sm hover:bg-[#f8f8f8]"
                            >
                                Upload file
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenSectionModal}
                                className="rounded border border-[#ddd] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1264a3] shadow-sm hover:bg-[#f0f8ff]"
                            >
                                + New section
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Render each section with section name header and its docs inside */}
                        {sectionsToDisplay.map((sec) => {
                            const docsInSection = filteredDocs.filter((d) => d.sectionId === sec.id);

                            // When searching, hide sections that don't match
                            if (searchQuery && docsInSection.length === 0) {
                                return null;
                            }

                            return (
                                <section key={sec.id} className="mb-8 last:mb-2">
                                    {/* Section Header */}
                                    <div className="flex items-center justify-between border-b border-[#e2e2e2] pb-2 mb-3.5">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-sm font-black text-[#1d1c1d] tracking-tight">
                                                {sec.name}
                                            </h3>
                                            {sec.description && (
                                                <span className="text-xs text-[#868686] hidden sm:inline">
                                                    — {sec.description}
                                                </span>
                                            )}
                                            <span className="text-xs text-[#868686] font-medium">
                                                ({docsInSection.length})
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAddModal("write", sec.id)}
                                                className="text-xs font-bold text-[#1264a3] hover:underline"
                                            >
                                                + Write doc
                                            </button>
                                            <span className="text-[#ccc] text-xs">•</span>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAddModal("upload", sec.id)}
                                                className="text-xs font-bold text-[#1264a3] hover:underline"
                                            >
                                                + Upload file
                                            </button>
                                        </div>
                                    </div>

                                    {/* Docs inside this section */}
                                    {docsInSection.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-[#e2e2e2] bg-[#fafafa] px-4 py-6 text-center text-xs text-[#616061]">
                                            No documents in {sec.name} yet.{" "}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAddModal("write", sec.id)}
                                                className="font-bold text-[#1264a3] hover:underline"
                                            >
                                                Add a doc
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                                            {docsInSection.map((doc) => {
                                                const badge = getFileTypeBadge(doc);
                                                return (
                                                    <div
                                                        key={doc.id}
                                                        onClick={() => handleViewDoc(doc)}
                                                        className="group relative flex flex-col justify-between rounded-lg border border-[#ddd] bg-white p-4 shadow-sm hover:border-[#1264a3] hover:shadow transition cursor-pointer"
                                                    >
                                                        <div>
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span
                                                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                                                                >
                                                                    {badge.label}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                                                                    disabled={deletingId === doc.id}
                                                                    className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded text-xs text-[#b00020] hover:bg-[#fff5f5] flex items-center justify-center transition"
                                                                    title="Delete document"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>

                                                            <h4 className="mt-2 text-sm font-bold text-[#1d1c1d] line-clamp-1 group-hover:text-[#1264a3]">
                                                                {doc.title}
                                                            </h4>

                                                            {doc.fileName && (
                                                                <p className="mt-0.5 text-[11px] text-[#616061] truncate font-mono">
                                                                    {doc.fileName}
                                                                </p>
                                                            )}

                                                            <p className="mt-1.5 text-xs text-[#616061] line-clamp-2 leading-relaxed">
                                                                {doc.content || "Uploaded file stored in database."}
                                                            </p>
                                                        </div>

                                                        <div className="mt-3.5 flex items-center justify-between border-t border-[#f0f0f0] pt-2 text-[11px] text-[#868686]">
                                                            <span>{doc.createdBy?.name || "Member"}</span>
                                                            <div className="flex items-center gap-1.5">
                                                                {doc.fileSize && <span>{formatBytes(doc.fileSize)} •</span>}
                                                                <span>{formatDate(doc.createdAt)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            );
                        })}

                        {/* Uncategorized section if any */}
                        {selectedSectionId === "all" && uncategorizedDocs.length > 0 && (
                            <section className="mb-8 last:mb-2">
                                <div className="flex items-center justify-between border-b border-[#e2e2e2] pb-2 mb-3.5">
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-sm font-black text-[#1d1c1d]">Other Documents</h3>
                                        <span className="text-xs text-[#868686]">({uncategorizedDocs.length})</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                                    {uncategorizedDocs.map((doc) => {
                                        const badge = getFileTypeBadge(doc);
                                        return (
                                            <div
                                                key={doc.id}
                                                onClick={() => handleViewDoc(doc)}
                                                className="group relative flex flex-col justify-between rounded-lg border border-[#ddd] bg-white p-4 shadow-sm hover:border-[#1264a3] hover:shadow transition cursor-pointer"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                                                        >
                                                            {badge.label}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                                                            disabled={deletingId === doc.id}
                                                            className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded text-xs text-[#b00020] hover:bg-[#fff5f5] flex items-center justify-center transition"
                                                            title="Delete document"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>

                                                    <h4 className="mt-2 text-sm font-bold text-[#1d1c1d] line-clamp-1 group-hover:text-[#1264a3]">
                                                        {doc.title}
                                                    </h4>

                                                    {doc.fileName && (
                                                        <p className="mt-0.5 text-[11px] text-[#616061] truncate font-mono">
                                                            {doc.fileName}
                                                        </p>
                                                    )}

                                                    <p className="mt-1.5 text-xs text-[#616061] line-clamp-2 leading-relaxed">
                                                        {doc.content || "Uploaded file stored in database."}
                                                    </p>
                                                </div>

                                                <div className="mt-3.5 flex items-center justify-between border-t border-[#f0f0f0] pt-2 text-[11px] text-[#868686]">
                                                    <span>{doc.createdBy?.name || "Member"}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {doc.fileSize && <span>{formatBytes(doc.fileSize)} •</span>}
                                                        <span>{formatDate(doc.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Create New Section */}
            {isSectionModalOpen && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget && !savingSection) {
                            handleCloseSectionModal();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-section-title"
                        className="w-full max-w-[480px] rounded-lg bg-white text-[#1d1c1d] shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-[#ddd] px-6 py-4">
                            <div>
                                <h2 id="create-section-title" className="text-base font-black">
                                    Create document section
                                </h2>
                                <p className="mt-0.5 text-xs text-[#616061]">
                                    Organize documents into dedicated categories (e.g. Design Docs, Testing Docs, Review Docs).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseSectionModal}
                                disabled={savingSection}
                                className="flex h-8 w-8 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8]"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateSection} className="space-y-4 px-6 py-5">
                            {sectionError && (
                                <p className="rounded border border-[#f4c7c3] bg-[#fff5f5] px-3 py-2 text-xs text-[#b00020]">
                                    {sectionError}
                                </p>
                            )}

                            <div>
                                <label htmlFor="new-section-name" className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                    Section name
                                </label>
                                <input
                                    id="new-section-name"
                                    type="text"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    placeholder="e.g. Security Audit Docs, API Specs, Meeting Notes"
                                    maxLength={80}
                                    autoFocus
                                    disabled={savingSection}
                                    className="h-10 w-full rounded border border-[#868686] px-3 text-xs outline-none focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                                />
                            </div>

                            <div>
                                <label htmlFor="new-section-desc" className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                    Description <span className="font-normal text-[#868686]">(optional)</span>
                                </label>
                                <input
                                    id="new-section-desc"
                                    type="text"
                                    value={newSectionDesc}
                                    onChange={(e) => setNewSectionDesc(e.target.value)}
                                    placeholder="Brief purpose of this section"
                                    maxLength={150}
                                    disabled={savingSection}
                                    className="h-10 w-full rounded border border-[#868686] px-3 text-xs outline-none focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-[#eee] pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseSectionModal}
                                    disabled={savingSection}
                                    className="rounded px-3 py-1.5 text-xs font-bold text-[#616061] hover:bg-[#f8f8f8]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSection}
                                    className="rounded bg-[#007a5a] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#148567] disabled:opacity-50"
                                >
                                    {savingSection ? "Creating..." : "Create section"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Document (Write or Upload) with Section Selection */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget && !saving) {
                            handleCloseAddModal();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-doc-title"
                        className="w-full max-w-[580px] rounded-lg bg-white text-[#1d1c1d] shadow-2xl"
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-[#ddd] px-6 py-4">
                            <div>
                                <h2 id="add-doc-title" className="text-lg font-black">
                                    Add document to project
                                </h2>
                                <p className="mt-0.5 text-xs text-[#616061]">
                                    Documents are stored directly in database and securely isolated to this project.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseAddModal}
                                disabled={saving}
                                className="flex h-8 w-8 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8]"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-[#eee] bg-[#f8f8f8] px-6 pt-2">
                            <button
                                type="button"
                                onClick={() => setAddTab("write")}
                                className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                                    addTab === "write"
                                        ? "border-[#007a5a] text-[#007a5a] bg-white rounded-t"
                                        : "border-transparent text-[#616061] hover:text-[#1d1c1d]"
                                }`}
                            >
                                Write document
                            </button>
                            <button
                                type="button"
                                onClick={() => setAddTab("upload")}
                                className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                                    addTab === "upload"
                                        ? "border-[#007a5a] text-[#007a5a] bg-white rounded-t"
                                        : "border-transparent text-[#616061] hover:text-[#1d1c1d]"
                                }`}
                            >
                                Upload file
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateDoc} className="space-y-4 px-6 py-5">
                            {formError && (
                                <p className="rounded border border-[#f4c7c3] bg-[#fff5f5] px-3 py-2 text-xs text-[#b00020]">
                                    {formError}
                                </p>
                            )}

                            {/* Section Selector */}
                            <div>
                                <div className="mb-1 flex items-center justify-between">
                                    <label htmlFor="doc-section-select" className="text-xs font-bold text-[#1d1c1d]">
                                        Document Section
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingInlineSection(!isCreatingInlineSection)}
                                        className="text-[11px] font-bold text-[#1264a3] hover:underline"
                                    >
                                        {isCreatingInlineSection
                                            ? "← Choose existing section"
                                            : "+ Create new section"}
                                    </button>
                                </div>

                                {isCreatingInlineSection ? (
                                    <input
                                        type="text"
                                        value={inlineSectionName}
                                        onChange={(e) => setInlineSectionName(e.target.value)}
                                        placeholder="e.g. Design Docs, Testing Docs, Review Docs..."
                                        maxLength={80}
                                        autoFocus
                                        disabled={saving}
                                        className="h-10 w-full rounded border border-[#1264a3] px-3 text-xs outline-none focus:ring-1 focus:ring-[#1264a3]"
                                    />
                                ) : (
                                    <select
                                        id="doc-section-select"
                                        value={docSectionId}
                                        onChange={(e) => {
                                            if (e.target.value === "__NEW__") {
                                                setIsCreatingInlineSection(true);
                                            } else {
                                                setDocSectionId(e.target.value);
                                            }
                                        }}
                                        disabled={saving}
                                        className="h-10 w-full rounded border border-[#868686] bg-white px-3 text-xs outline-none focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                                    >
                                        {sections.map((sec) => (
                                            <option key={sec.id} value={sec.id}>
                                                {sec.name}
                                            </option>
                                        ))}
                                        <option value="__NEW__">+ Create new section...</option>
                                    </select>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label htmlFor="doc-title" className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                    Document title
                                </label>
                                <input
                                    id="doc-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={
                                        addTab === "write"
                                            ? "e.g. Architecture Specification"
                                            : "e.g. Test Run Results"
                                    }
                                    maxLength={150}
                                    autoFocus={!isCreatingInlineSection}
                                    disabled={saving}
                                    className="h-10 w-full rounded border border-[#868686] px-3 text-xs outline-none placeholder:text-[#868686] focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                                />
                            </div>

                            {/* Write Content or Upload File */}
                            {addTab === "write" ? (
                                <div>
                                    <label htmlFor="doc-content" className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                        Content (Markdown / Text)
                                    </label>
                                    <textarea
                                        id="doc-content"
                                        rows={7}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Write your document content here in markdown or plain text..."
                                        disabled={saving}
                                        className="w-full resize-none rounded border border-[#868686] p-3 text-xs font-mono outline-none placeholder:text-[#868686] focus:border-[#1264a3] focus:ring-1 focus:ring-[#1264a3]"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <span className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                        Choose file to store in database
                                    </span>
                                    <div className="rounded-lg border-2 border-dashed border-[#ccc] p-6 text-center hover:border-[#1264a3] bg-[#fafafa]">
                                        <input
                                            id={docFileInputId}
                                            type="file"
                                            onChange={handleFileSelect}
                                            disabled={saving}
                                            className="hidden"
                                        />
                                        <label
                                            htmlFor={docFileInputId}
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f0f0] text-[#616061] mb-2">
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                            </div>
                                            <span className="text-xs font-bold text-[#1264a3] hover:underline">
                                                {selectedFile ? selectedFile.name : "Select a file from your computer"}
                                            </span>
                                            <span className="mt-1 text-[11px] text-[#616061]">
                                                {selectedFile
                                                    ? `${formatBytes(selectedFile.size)} • Ready to store`
                                                    : "Supports PDF, Markdown, TXT, DOCX, JSON, images, etc."}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2 border-t border-[#eee] pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseAddModal}
                                    disabled={saving}
                                    className="rounded px-3 py-1.5 text-xs font-bold text-[#616061] hover:bg-[#f8f8f8]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded bg-[#007a5a] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#148567] disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save document"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {viewingDoc && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setViewingDoc(null);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="view-doc-title"
                        className="flex flex-col max-h-[85vh] w-full max-w-[720px] rounded-lg bg-white text-[#1d1c1d] shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-[#ddd] px-6 py-4">
                            <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getFileTypeBadge(viewingDoc).bg} ${getFileTypeBadge(viewingDoc).text} ${getFileTypeBadge(viewingDoc).border}`}
                                    >
                                        {getFileTypeBadge(viewingDoc).label}
                                    </span>
                                    <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-bold text-[#616061] border border-[#ddd]">
                                        {viewingDoc.section?.name || "General"}
                                    </span>
                                    <h3 id="view-doc-title" className="text-base font-bold truncate">
                                        {viewingDoc.title}
                                    </h3>
                                </div>
                                <p className="mt-1 text-xs text-[#616061] flex items-center gap-2">
                                    <span>Created by {viewingDoc.createdBy?.name || "Member"}</span>
                                    <span>•</span>
                                    <span>{formatDate(viewingDoc.createdAt)}</span>
                                    {viewingDoc.fileSize && (
                                        <>
                                            <span>•</span>
                                            <span>{formatBytes(viewingDoc.fileSize)}</span>
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {viewingDoc.fileData && (
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadFile(viewingDoc)}
                                        className="rounded border border-[#ddd] bg-white px-2.5 py-1 text-xs font-bold text-[#1d1c1d] hover:bg-[#f8f8f8]"
                                        title="Download stored file"
                                    >
                                        Download
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setViewingDoc(null)}
                                    className="flex h-8 w-8 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8]"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingDocDetail ? (
                                <div className="py-12 text-center text-xs text-[#616061]">
                                    Fetching document details...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Preview if image */}
                                    {viewingDoc.fileData && viewingDoc.fileType?.startsWith("image/") && (
                                        <div className="rounded-lg border border-[#eee] bg-[#f8f8f8] p-2 flex justify-center">
                                            <img
                                                src={viewingDoc.fileData}
                                                alt={viewingDoc.title}
                                                className="max-h-96 rounded object-contain"
                                            />
                                        </div>
                                    )}

                                    {/* Text / Markdown Content */}
                                    {viewingDoc.content ? (
                                        <div className="rounded-lg border border-[#eee] bg-[#fafafa] p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                                            {viewingDoc.content}
                                        </div>
                                    ) : !viewingDoc.fileType?.startsWith("image/") ? (
                                        <div className="rounded-lg border border-[#eee] bg-[#f9f9f9] p-8 text-center text-xs text-[#616061]">
                                            <p className="font-bold text-[#1d1c1d] mb-1">
                                                File stored in database
                                            </p>
                                            <p className="mb-4">
                                                File: {viewingDoc.fileName || viewingDoc.title} ({formatBytes(viewingDoc.fileSize)})
                                            </p>
                                            {viewingDoc.fileData && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadFile(viewingDoc)}
                                                    className="rounded bg-[#007a5a] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#148567]"
                                                >
                                                    Download file
                                                </button>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-[#ddd] bg-[#fdfdfd] px-6 py-3">
                            <span className="text-[11px] text-[#616061] font-medium">
                                Section: {viewingDoc.section?.name || "General"}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => handleDeleteDoc(viewingDoc.id, e)}
                                    className="rounded px-3 py-1 text-xs font-bold text-[#b00020] hover:bg-[#fff5f5]"
                                >
                                    Delete document
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingDoc(null)}
                                    className="rounded bg-[#f0f0f0] px-3 py-1 text-xs font-bold hover:bg-[#e4e4e4]"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Docs;
