import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import SuccessDialog from "../../components/SuccessDialog";

const Logo = () => (
    <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const CreateTenant = () => {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [createdTenant, setCreatedTenant] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const tenantName = name.trim();

        if (!tenantName) {
            setError("Workspace name is required.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const data = await api.createTenant({ name: tenantName });
            const tenant = data.tenant || data;

            setCreatedTenant(tenant);
            setShowSuccess(true);
        } catch (createError) {
            setError(createError.message || "Failed to create workspace.");
        } finally {
            setLoading(false);
        }
    };

    const openCreatedWorkspace = () => {
        setShowSuccess(false);

        if (createdTenant?.id) {
            navigate(`/tenants/${createdTenant.id}`);
        } else {
            navigate("/dashboard");
        }
    };

    return (
        <>
            <div className="flex min-h-screen bg-[#3f0e40] text-white">
                <aside className="hidden w-[300px] shrink-0 flex-col border-r border-white/10 md:flex">
                    <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
                        <Logo />
                        <span className="text-xl font-black">Workly</span>
                    </div>
                    <div className="px-3 py-4">
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
                        >
                            <span className="w-5 text-center">H</span>
                            All workspaces
                        </button>
                    </div>
                </aside>

                <main className="flex flex-1 items-center justify-center bg-white px-6 py-12 text-[#1d1c1d]">
                    <div className="w-full max-w-[520px]">
                        <div className="mb-8">
                            <h1 className="text-3xl font-black tracking-tight">
                                Create a workspace
                            </h1>
                            <p className="mt-2 text-sm text-[#616061]">
                                Workspaces hold your projects, channels, and team conversations.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="rounded-lg border border-[#ddd] bg-white p-6 shadow-sm">
                            {error && (
                                <div className="mb-5 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                                    {error}
                                </div>
                            )}

                            <label htmlFor="tenant-name" className="mb-2 block text-sm font-black">
                                Workspace name
                            </label>
                            <input
                                id="tenant-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="e.g. Acme Inc"
                                maxLength={100}
                                autoFocus
                                className="h-11 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                            />

                            <div className="mt-6 flex justify-end gap-3 border-t border-[#ddd] pt-5">
                                <button
                                    type="button"
                                    onClick={() => navigate("/dashboard")}
                                    disabled={loading}
                                    className="rounded-md px-4 py-2 text-sm font-bold hover:bg-[#f8f8f8]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="rounded-md bg-[#007a5a] px-4 py-2 text-sm font-bold text-white hover:bg-[#148567] disabled:opacity-50"
                                >
                                    {loading ? "Creating..." : "Create workspace"}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

            <SuccessDialog
                open={showSuccess}
                title="Workspace created"
                message={`"${createdTenant?.name || name}" has been created successfully.`}
                buttonText="Open workspace"
                onContinue={openCreatedWorkspace}
            />
        </>
    );
};

export default CreateTenant;
