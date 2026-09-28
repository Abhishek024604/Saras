import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const Logo = () => (
    <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const getInitial = (name) => name?.charAt(0)?.toUpperCase() || "W";

const Dashboard = () => {
    const navigate = useNavigate();

    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [orgName, setOrgName] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const loadDashboard = async () => {
        try {
            const data = await api.getMemberships();
            setMemberships(data.memberships || []);
        } catch (loadError) {
            setError(loadError.message || "Failed to load workspaces.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const openCreateModal = () => {
        setOrgName("");
        setCreateError("");
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (!creating) {
            setIsCreateModalOpen(false);
            setOrgName("");
            setCreateError("");
        }
    };

    const handleCreateOrganization = async (e) => {
        e.preventDefault();
        const trimmedName = orgName.trim();
        if (!trimmedName) {
            setCreateError("Organization name is required.");
            return;
        }

        try {
            setCreating(true);
            setCreateError("");
            const data = await api.createTenant({ name: trimmedName });
            const tenant = data.tenant || data;

            await loadDashboard();
            setIsCreateModalOpen(false);
            setOrgName("");

            if (tenant?.id) {
                navigate(`/tenants/${tenant.id}`);
            }
        } catch (err) {
            setCreateError(err.message || "Failed to create organization.");
        } finally {
            setCreating(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.logout();
        } catch (logoutError) {
            console.error(logoutError);
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            navigate("/login");
        }
    };

    return (
        <div className="flex min-h-screen bg-[#3f0e40] text-white">
            <aside className="hidden w-[300px] shrink-0 flex-col border-r border-white/10 md:flex">
                <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
                    <Logo />
                    <span className="text-xl font-black">Workly</span>
                </div>

                <nav className="space-y-1 px-3 py-4">
                    <button className="flex w-full items-center gap-3 rounded-md bg-white/15 px-3 py-2 text-left text-sm font-bold">
                        <span className="w-5 text-center">H</span>
                        Home
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white">
                        <span className="w-5 text-center">S</span>
                        Search
                    </button>
                </nav>

                <div className="px-3">
                    <div className="mb-2 flex items-center justify-between px-3">
                        <span className="text-sm font-bold text-white/80">Organizations</span>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="flex h-7 w-7 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
                            aria-label="Create organization"
                            title="Create organization"
                        >
                            +
                        </button>
                    </div>

                    <div className="space-y-0.5">
                        {memberships.map(({ tenant }) => (
                            <button
                                key={tenant.id}
                                type="button"
                                onClick={() => navigate(`/tenants/${tenant.id}`)}
                                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#1264a3] text-xs font-black text-white">
                                    {getInitial(tenant.name)}
                                </span>
                                <span className="truncate">{tenant.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-auto border-t border-white/10 p-4">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full rounded-md px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white"
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col bg-white text-[#1d1c1d]">
                <header className="flex h-14 items-center justify-between border-b border-[#ddd] bg-[#350d36] px-5 text-white">
                    <div className="flex items-center gap-3 md:hidden">
                        <Logo />
                        <span className="font-black">Workly</span>
                    </div>
                    <div className="mx-auto hidden h-9 w-full max-w-[720px] items-center rounded-md border border-white/20 bg-white/15 px-4 text-sm text-white/70 md:flex">
                        Search organizations, projects, and channels
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="rounded-md bg-white px-3 py-1.5 text-sm font-bold text-[#3f0e40] hover:bg-[#f4ede4]"
                    >
                        Create organization
                    </button>
                </header>

                <section className="mx-auto w-full max-w-5xl px-6 py-10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">
                                Organizations
                            </h1>
                            <p className="mt-2 text-sm text-[#616061]">
                                Choose an organization to open its projects and channels.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-6 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="mt-16 flex items-center justify-center text-sm text-[#616061]">
                            Loading your organizations...
                        </div>
                    ) : memberships.length === 0 ? (
                        <div className="mt-10 rounded-lg border border-dashed border-[#ddd] bg-[#f8f8f8] px-6 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-[#f4ede4] text-3xl font-black text-[#4a154b]">
                                +
                            </div>
                            <h2 className="mt-4 text-xl font-black">No organizations yet</h2>
                            <p className="mt-2 text-sm text-[#616061]">
                                Create an organization to start collaborating with your team.
                            </p>
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="mt-5 rounded-md bg-[#007a5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#148567]"
                            >
                                Create organization
                            </button>
                        </div>
                    ) : (
                        <div className="mt-8 overflow-hidden rounded-lg border border-[#ddd] bg-white">
                            {memberships.map((membership) => {
                                const { tenant } = membership;
                                const role = membership.role || "MEMBER";

                                return (
                                    <button
                                        key={tenant.id}
                                        type="button"
                                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                                        className="flex w-full items-center justify-between gap-4 border-b border-[#eee] px-5 py-4 text-left last:border-b-0 hover:bg-[#f8f8f8]"
                                    >
                                        <span className="flex min-w-0 items-center gap-4">
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#1264a3] text-sm font-black text-white">
                                                {getInitial(tenant.name)}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-black">
                                                    {tenant.name}
                                                </span>
                                                <span className="mt-0.5 block text-sm text-[#616061]">
                                                    {role.toLowerCase()}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="text-sm font-bold text-[#1264a3]">
                                            Open
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {isCreateModalOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !creating) {
                            closeCreateModal();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-org-title"
                        className="w-full max-w-[520px] rounded-lg bg-white text-[#1d1c1d] shadow-2xl"
                    >
                        <div className="flex items-start justify-between border-b border-[#ddd] px-6 py-5">
                            <div>
                                <h2 id="create-org-title" className="text-[22px] font-black">
                                    Create organization
                                </h2>
                                <p className="mt-1 text-sm text-[#616061]">
                                    Organizations hold your projects, channels, and team conversations.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={creating}
                                className="flex h-9 w-9 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8]"
                                aria-label="Close dialog"
                            >
                                x
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrganization} className="space-y-5 px-6 py-5">
                            <div>
                                <label htmlFor="organization-name" className="mb-2 block text-sm font-black">
                                    Organization name
                                </label>
                                <input
                                    id="organization-name"
                                    value={orgName}
                                    onChange={(event) => setOrgName(event.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    maxLength={100}
                                    autoFocus
                                    disabled={creating}
                                    className="h-11 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                />
                            </div>

                            {createError && (
                                <p className="rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-3 py-2 text-sm text-[#b00020]">
                                    {createError}
                                </p>
                            )}

                            <div className="flex justify-end gap-3 border-t border-[#ddd] pt-5">
                                <button
                                    type="button"
                                    onClick={closeCreateModal}
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
                                    {creating ? "Creating..." : "Create organization"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
