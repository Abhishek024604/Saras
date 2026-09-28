import { useState, useRef, useEffect } from "react";

const Icon = ({ children, className = "" }) => (
    <svg
        className={className}
        width="18"
        height="18"
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

const MessageComposer = ({
    channelName,
    onSend,
    sending,
    agents = [],
    onExecuteTask,
    onProvisionAgents,
    provisioning = false,
}) => {
    const [content, setContent] = useState("");
    const [selectedAgentId, setSelectedAgentId] = useState("");
    const [agentMenuOpen, setAgentMenuOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setAgentMenuOpen(false);
            }
        };

        if (agentMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [agentMenuOpen]);

    const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedContent = content.trim();

        if (!trimmedContent || sending) {
            return;
        }

        try {
            if (selectedAgent && onExecuteTask) {
                await onExecuteTask(selectedAgent.id, trimmedContent);
            } else {
                await onSend(trimmedContent);
            }
            setContent("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
        }
    };

    return (
        <div className="relative z-30 shrink-0 bg-white px-3 pb-2 pt-1">
            <form
                onSubmit={handleSubmit}
                className="relative rounded-lg border border-[#868686] bg-white shadow-xs focus-within:border-[#1d1c1d] focus-within:shadow-[0_0_0_1px_#1d1c1d]"
            >
                {selectedAgent && (
                    <div className="flex items-center justify-between rounded-t-[7px] border-b border-[#ecdeec] bg-[#fbf5fb] px-2.5 py-1 text-[11px] text-[#4a154b]">
                        <div className="flex items-center gap-1.5 font-bold">
                            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4a154b] text-[7px] font-black text-white">
                                AI
                            </span>
                            <span className="truncate">
                                Task will be executed by{" "}
                                <span className="underline">
                                    {selectedAgent.displayName || selectedAgent.agentDefinition?.name || selectedAgent.name || "Agent"}
                                </span>{" "}
                                {(selectedAgent.agentDefinition?.role || selectedAgent.role) && `(${selectedAgent.agentDefinition?.role || selectedAgent.role})`}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedAgentId("")}
                            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#4a154b] hover:bg-[#ecdeec]"
                        >
                            Reset to Team ✕
                        </button>
                    </div>
                )}

                <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        selectedAgent
                            ? `Type task instructions for ${selectedAgent.displayName || selectedAgent.agentDefinition?.name || selectedAgent.name || "Agent"} in #${channelName}...`
                            : `Message #${channelName} (or select an Agent below)`
                    }
                    rows={2}
                    disabled={sending}
                    className={`max-h-24 min-h-[46px] w-full resize-none px-3 py-1.5 text-xs leading-5 text-[#1d1c1d] outline-none placeholder:text-[#616061] disabled:cursor-not-allowed disabled:bg-white ${
                        !selectedAgent ? "rounded-t-[7px]" : ""
                    }`}
                />

                <div className="flex min-h-8 items-center justify-between rounded-b-[7px] border-t border-[#e8e8e8] px-2 py-1">
                    <div className="flex items-center gap-1 text-[#616061]">
                        <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                            title="Add attachment"
                            aria-label="Add attachment"
                        >
                            <Icon className="h-3.5 w-3.5">
                                <path d="M12 5v14" />
                                <path d="M5 12h14" />
                            </Icon>
                        </button>

                        <button
                            type="button"
                            className="flex h-6 w-6 items-center justify-center rounded text-[#616061] hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                            title="Formatting"
                            aria-label="Formatting"
                        >
                            <span className="text-xs font-black">Aa</span>
                        </button>

                        <button
                            type="button"
                            className="hidden h-6 items-center rounded px-1.5 text-[10px] text-[#616061] hover:bg-[#f8f8f8] sm:flex"
                            title="New line"
                        >
                            Shift + Enter for new line
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Agent Selector Dropdown - Always visible in the message composer */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setAgentMenuOpen((prev) => !prev)}
                                className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition ${
                                    selectedAgent
                                        ? "border-[#4a154b] bg-[#ecdeec] text-[#4a154b] ring-1 ring-[#4a154b]/30"
                                        : "border-[#868686] bg-[#f8f8f8] text-[#1d1c1d] hover:bg-[#eee]"
                                }`}
                                title="Select AI Agent for task execution"
                            >
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-[#3f0e40] to-[#1264a3] text-[7px] font-black text-white">
                                    AI
                                </span>
                                <span className="max-w-[110px] truncate text-[11px]">
                                    {selectedAgent
                                        ? (selectedAgent.displayName || selectedAgent.agentDefinition?.name || selectedAgent.name || "Agent")
                                        : "Select Agent"}
                                </span>
                                <Icon className="h-2.5 w-2.5 text-[#616061]">
                                    <path d="m6 9 6 6 6-6" />
                                </Icon>
                            </button>

                            {agentMenuOpen && (
                                <div className="absolute bottom-full right-0 z-50 mb-1.5 flex max-h-[300px] w-72 flex-col overflow-hidden rounded-lg border border-[#ddd] bg-white shadow-2xl">
                                    <div className="flex shrink-0 items-center justify-between border-b border-[#eee] bg-[#f8f8f8] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#616061]">
                                        <span>Select Destination</span>
                                        <span>{agents.length} Agents</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedAgentId("");
                                            setAgentMenuOpen(false);
                                        }}
                                        className={`flex shrink-0 w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition hover:bg-[#f8f8f8] ${
                                            !selectedAgentId
                                                ? "bg-[#e8f5fa] font-bold text-[#1264a3]"
                                                : "text-[#1d1c1d]"
                                        }`}
                                    >
                                        <span className="text-xs">👥</span>
                                        <div>
                                            <p className="font-bold text-xs leading-none">Team / Everyone</p>
                                            <p className="text-[9px] text-[#616061] mt-0.5">Regular chat message to channel</p>
                                        </div>
                                    </button>

                                    <div className="shrink-0 border-t border-[#eee] bg-[#fafafa] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#616061]">
                                        Execute AI Agent Task
                                    </div>

                                    {agents.length === 0 ? (
                                        <div className="p-3 text-center">
                                            <p className="text-[11px] text-[#616061]">No AI agents provisioned yet for this project.</p>
                                            {onProvisionAgents && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await onProvisionAgents();
                                                    }}
                                                    disabled={provisioning}
                                                    className="mt-2 inline-flex items-center gap-1 rounded bg-[#3f0e40] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-[#350d36] disabled:opacity-50"
                                                >
                                                    {provisioning ? "Provisioning..." : "⚡ Provision Agents Now"}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto no-scrollbar max-h-40 divide-y divide-[#f5f5f5]">
                                            {agents.map((agent) => {
                                                const isSelected = selectedAgentId === agent.id;
                                                const agentName = agent.displayName || agent.agentDefinition?.name || agent.name || "Agent";
                                                const agentRole = agent.agentDefinition?.role || agent.role;
                                                const agentDesc = agent.agentDefinition?.description || agent.description || "Executes specialized AI tasks";

                                                return (
                                                    <button
                                                        key={agent.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedAgentId(agent.id);
                                                            setAgentMenuOpen(false);
                                                        }}
                                                        className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition hover:bg-[#f8f8f8] ${
                                                            isSelected
                                                                ? "bg-[#ecdeec] font-bold text-[#4a154b]"
                                                                : "text-[#1d1c1d]"
                                                        }`}
                                                    >
                                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#3f0e40] text-[7px] font-black text-white">
                                                            AI
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className="truncate text-xs font-bold leading-tight">
                                                                    {agentName}
                                                                </p>
                                                                {agentRole && (
                                                                    <span className="rounded bg-black/5 px-1 py-0.2 text-[8px] font-semibold text-[#616061] shrink-0">
                                                                        {agentRole}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="truncate text-[10px] text-[#616061]">
                                                                {agentDesc}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {onProvisionAgents && (
                                        <div className="shrink-0 border-t border-[#eee] bg-[#fcfcfc] px-2.5 py-1 text-right">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await onProvisionAgents();
                                                }}
                                                disabled={provisioning}
                                                className="text-[10px] font-semibold text-[#1264a3] hover:underline disabled:opacity-50"
                                            >
                                                {provisioning ? "Syncing..." : "↻ Sync / Provision Agents"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!content.trim() || sending}
                            className={`flex h-7 min-w-8 items-center justify-center rounded px-2.5 text-xs font-bold transition ${
                                content.trim() && !sending
                                    ? selectedAgent
                                        ? "bg-[#4a154b] text-white hover:bg-[#350d36]"
                                        : "bg-[#007a5a] text-white hover:bg-[#148567]"
                                    : "bg-[#dddddd] text-[#616061]"
                            } disabled:cursor-not-allowed`}
                            title={selectedAgent ? "Execute Agent Task" : "Send message"}
                            aria-label={selectedAgent ? "Execute Agent Task" : "Send message"}
                        >
                            {sending ? (
                                "..."
                            ) : (
                                <Icon className="h-3 w-3">
                                    <path d="m22 2-7 20-4-9-9-4Z" />
                                    <path d="M22 2 11 13" />
                                </Icon>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default MessageComposer;
