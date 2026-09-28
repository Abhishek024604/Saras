import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";

const Logo = () => (
    <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const TenantWorkspace = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();

    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [dialogError, setDialogError] = useState("");

    useEffect(() => {
        const loadWorkspace = async () => {
            try {
                setLoading(true);
                setError("");

                const [tenantResponse, projectsResponse] = await Promise.all([
                    api.getTenant(tenantId),
                    api.getProjects(tenantId),
                ]);

                const projects = projectsResponse.projects || [];

                setTenant(tenantResponse.tenant);

                if (projects.length > 0) {
                    navigate(`/tenants/${tenantId}/projects/${projects[0].id}`, {
                        replace: true,
                    });
                    return;
                }
            } catch (loadError) {
                setError(loadError.message || "Failed to load workspace.");
            } finally {
                setLoading(false);
            }
        };

        loadWorkspace();
    }, [navigate, tenantId]);

    const handleCreateProject = async (event) => {
        event.preventDefault();

        const trimmedName = name.trim();

        if (!trimmedName) {
            setDialogError("Project name is required.");
            return;
        }

        try {
            setCreating(true);
            setDialogError("");

            const response = await api.createProject(tenantId, {
                name: trimmedName,
                description: description.trim(),
            });

            const project = response.project || response.data || response;

            if (project?.id) {
                navigate(`/tenants/${tenantId}/projects/${project.id}`, {
                    replace: true,
                });
                return;
            }

            navigate(`/tenants/${tenantId}`, { replace: true });
        } catch (createError) {
            setDialogError(createError.message || "Failed to create project.");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#3f0e40] text-white">
                <div className="flex items-center gap-3 rounded-md bg-white/10 px-4 py-3 text-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#2eb67d]" />
                    Opening workspace...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#3f0e40] px-6 text-white">
                <div className="max-w-sm text-center">
                    <Logo />
                    <h1 className="mt-5 text-xl font-black">Workspace unavailable</h1>
                    <p className="mt-2 text-sm text-white/70">{error}</p>
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard")}
                        className="mt-5 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#3f0e40]"
                    >
                        Back to dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#3f0e40] text-white">
            <aside className="hidden w-[72px] shrink-0 flex-col items-center border-r border-white/10 px-3 py-4 md:flex">
                <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="rounded-xl outline-none ring-white/30 transition hover:ring-4 focus-visible:ring-4"
                    aria-label="Dashboard"
                >
                    <Logo />
                </button>
            </aside>

            <aside className="flex w-[300px] shrink-0 flex-col border-r border-white/10">
                <div className="flex h-14 items-center border-b border-white/10 px-4">
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-black">
                            {tenant?.name || "Workspace"}
                        </p>
                        <p className="truncate text-xs text-white/60">
                            Slack-style workspace
                        </p>
                    </div>
                </div>

                <div className="px-3 py-3">
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard")}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
                    >
                        <span className="w-4 text-center">H</span>
                        All workspaces
                    </button>
                    <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
                    >
                        <span className="w-4 text-center">+</span>
                        Create project
                    </button>
                </div>
            </aside>

            <main className="flex flex-1 items-center justify-center bg-white px-6 text-[#1d1c1d]">
                <div className="max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-[#f4ede4] text-4xl font-black text-[#4a154b]">
                        #
                    </div>
                    <h1 className="mt-5 text-2xl font-black">
                        Create your first project
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-[#616061]">
                        This workspace is ready. Add a project, then create channels for the conversations inside it.
                    </p>
                    <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="mt-5 rounded-md bg-[#007a5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#148567]"
                    >
                        Create project
                    </button>
                </div>
            </main>

            {dialogOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !creating) {
                            setDialogOpen(false);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-project-title"
                        className="w-full max-w-[520px] rounded-lg bg-white text-[#1d1c1d] shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-[#ddd] px-6 py-5">
                            <div>
                                <h2 id="create-project-title" className="text-[22px] font-black">
                                    Create a project
                                </h2>
                                <p className="mt-1 text-sm text-[#616061]">
                                    Projects group related channels in this workspace.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                disabled={creating}
                                className="flex h-9 w-9 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8]"
                                aria-label="Close dialog"
                            >
                                x
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-5 px-6 py-5">
                            <div>
                                <label htmlFor="project-name" className="mb-2 block text-sm font-black">
                                    Project name
                                </label>
                                <input
                                    id="project-name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="e.g. Payment System"
                                    autoFocus
                                    disabled={creating}
                                    className="h-11 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                />
                            </div>

                            <div>
                                <label htmlFor="project-description" className="mb-2 block text-sm font-black">
                                    Description <span className="font-normal text-[#616061]">(optional)</span>
                                </label>
                                <textarea
                                    id="project-description"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    rows={3}
                                    placeholder="Add a short description"
                                    disabled={creating}
                                    className="w-full resize-none rounded-md border border-[#868686] px-3 py-2.5 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                />
                            </div>

                            {dialogError && (
                                <p className="rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-3 py-2 text-sm text-[#b00020]">
                                    {dialogError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 border-t border-[#ddd] pt-5">
                                <button
                                    type="button"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={creating}
                                    className="rounded-md px-4 py-2 text-sm font-bold hover:bg-[#f8f8f8]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="rounded-md bg-[#007a5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#148567] disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantWorkspace;
