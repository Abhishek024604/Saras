import { useState } from "react";
import api from "../../api/api";

const Icon = ({ children, className = "h-4 w-4" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {children}
    </svg>
);

const ProjectAgentsPanel = ({ projectId, agents = [], onReloadAgents }) => {
    const [provisioning, setProvisioning] = useState(false);
    const [error, setError] = useState("");

    const handleProvision = async () => {
        if (!projectId) return;
        try {
            setProvisioning(true);
            setError("");
            await api.provisionProjectAgents(projectId);
            if (onReloadAgents) {
                await onReloadAgents();
            }
        } catch (err) {
            setError(err.message || "Failed to provision agents.");
        } finally {
            setProvisioning(false);
        }
    };

    return (
        <section className="border-t border-[#ddd] pt-2.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-tr from-[#3f0e40] to-[#1264a3] text-[7px] font-black text-white">
                        AI
                    </span>
                    <h3 className="text-xs font-bold text-[#1d1c1d]">
                        Project Agents ({agents.length})
                    </h3>
                </div>
                {agents.length > 0 && (
                    <button
                        type="button"
                        onClick={handleProvision}
                        disabled={provisioning}
                        className="text-[10px] font-bold text-[#1264a3] hover:underline disabled:opacity-50"
                        title="Sync latest agent catalog"
                    >
                        {provisioning ? "Syncing..." : "Sync"}
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-1 rounded border border-[#f4c7c3] bg-[#fff5f5] p-1.5 text-[10px] text-[#b00020]">
                    {error}
                </p>
            )}

            {agents.length === 0 ? (
                <div className="mt-2 rounded border border-dashed border-[#ccc] bg-white p-2 text-center">
                    <p className="text-[11px] text-[#616061]">
                        No AI agents provisioned yet.
                    </p>
                    <button
                        type="button"
                        onClick={handleProvision}
                        disabled={provisioning}
                        className="mt-1.5 inline-flex items-center gap-1 rounded bg-[#007a5a] px-2 py-1 text-[10px] font-bold text-white transition hover:bg-[#148567] disabled:opacity-50"
                    >
                        <Icon className="h-3 w-3">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </Icon>
                        {provisioning ? "Provisioning..." : "Provision Agents"}
                    </button>
                </div>
            ) : (
                <div className="mt-2 space-y-1.5">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="flex items-start gap-2 rounded border border-[#e8e8e8] bg-white p-1.5 shadow-2xs"
                        >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-tr from-[#3f0e40] to-[#1264a3] text-[9px] font-black text-white">
                                {agent.displayName?.charAt(0) || "A"}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="truncate text-[11px] font-bold text-[#1d1c1d] leading-tight">
                                        {agent.displayName || agent.agentDefinition?.name || "Agent"}
                                    </p>
                                    <span className="shrink-0 rounded bg-[#ecdeec] px-1 py-0.2 text-[8px] font-bold uppercase text-[#4a154b]">
                                        {agent.agentDefinition?.role || "Agent"}
                                    </span>
                                </div>
                                <p className="mt-0.5 line-clamp-1 text-[10px] text-[#616061]">
                                    {agent.agentDefinition?.description || "Specialized AI assistant."}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default ProjectAgentsPanel;
