import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";

const CreateChannel = () => {
    const { tenantId, projectId } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Channel name is required.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await api.createChannel(projectId, {
                name: trimmedName,
                description: description.trim() || undefined,
                isPrivate,
            });

            const channel = response.channel || response.data || response;

            if (channel?.id) {
                navigate(`/tenants/${tenantId}/projects/${projectId}/channels/${channel.id}`);
                return;
            }

            navigate(`/tenants/${tenantId}/projects/${projectId}`);
        } catch (createError) {
            setError(createError.message || "Failed to create channel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#3f0e40] text-white">
            <aside className="hidden w-[300px] shrink-0 flex-col border-r border-white/10 md:flex">
                <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
                    <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
                        <span className="rounded-[3px] bg-[#36c5f0]" />
                        <span className="rounded-[3px] bg-[#2eb67d]" />
                        <span className="rounded-[3px] bg-[#e01e5a]" />
                        <span className="rounded-[3px] bg-[#ecb22e]" />
                    </div>
                    <span className="text-xl font-black">Workly</span>
                </div>
                <div className="px-3 py-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/tenants/${tenantId}/projects/${projectId}`)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 hover:text-white"
                    >
                        <span className="w-5 text-center">#</span>
                        Back to project
                    </button>
                </div>
            </aside>

            <main className="flex flex-1 items-center justify-center bg-white px-6 py-12 text-[#1d1c1d]">
                <div className="w-full max-w-[560px]">
                    <h1 className="text-3xl font-black tracking-tight">Create a channel</h1>
                    <p className="mt-2 text-sm text-[#616061]">
                        Channels keep project conversations focused and searchable.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-8 rounded-lg border border-[#ddd] bg-white p-6 shadow-sm">
                        {error && (
                            <div className="mb-5 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                                {error}
                            </div>
                        )}

                        <label htmlFor="channel-name" className="mb-2 block text-sm font-black">
                            Channel name
                        </label>
                        <div className="flex items-center rounded-md border border-[#868686] px-3 focus-within:border-[#1264a3] focus-within:ring-2 focus-within:ring-[#1264a3]/20">
                            <span className="mr-2 text-[#616061]">#</span>
                            <input
                                id="channel-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="e.g. frontend"
                                autoFocus
                                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[#616061]"
                            />
                        </div>

                        <label htmlFor="channel-description" className="mb-2 mt-5 block text-sm font-black">
                            Description <span className="font-normal text-[#616061]">(optional)</span>
                        </label>
                        <textarea
                            id="channel-description"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            rows={4}
                            placeholder="Add a short description"
                            className="w-full resize-none rounded-md border border-[#868686] px-3 py-2.5 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                        />

                        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(event) => setIsPrivate(event.target.checked)}
                                className="mt-1"
                            />
                            <span>
                                <span className="block font-black">Make channel private</span>
                                <span className="block text-[#616061]">
                                    Only permitted project members will be able to access it.
                                </span>
                            </span>
                        </label>

                        <div className="mt-6 flex justify-end gap-3 border-t border-[#ddd] pt-5">
                            <button
                                type="button"
                                onClick={() => navigate(`/tenants/${tenantId}/projects/${projectId}`)}
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
                                {loading ? "Creating..." : "Create channel"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateChannel;
