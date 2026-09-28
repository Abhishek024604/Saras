import { useEffect, useMemo, useState } from "react";
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

const CodeBlock = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <div className="my-2 max-w-full overflow-hidden rounded-md border border-[#3c3c3c] bg-[#1e1e1e] text-white">
            <div className="flex items-center justify-between border-b border-[#333] bg-[#252526] px-3 py-1 text-xs text-[#cccccc]">
                <span className="font-mono font-medium text-[#9cdcfe]">
                    {language || "code"}
                </span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[#cccccc] transition hover:bg-white/10 hover:text-white"
                >
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-5 text-[#d4d4d4]">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const parseContent = (content) => {
    if (!content) return [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({
                type: "text",
                value: content.slice(lastIndex, match.index),
            });
        }
        parts.push({
            type: "code",
            language: match[1] || "",
            code: match[2].trimEnd(),
        });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        parts.push({
            type: "text",
            value: content.slice(lastIndex),
        });
    }

    return parts;
};

const PrivateSpace = ({
    tenantId,
    projectId,
    activeChannelId,
    agents = [],
    currentUser,
    onPushToChannel,
}) => {
    const storageKey = `private_chats_${tenantId || "default"}_${currentUser?.id || "user"}`;

    // Load saved chats from localStorage
    const [chats, setChats] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [activeChatId, setActiveChatId] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.length > 0 ? parsed[0].id : null;
        } catch {
            return null;
        }
    });

    const [inputMessage, setInputMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState("");
    const [detailsOpen, setDetailsOpen] = useState(true);
    const [pushSuccess, setPushSuccess] = useState("");

    // Save chats to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(chats));
        } catch (e) {
            console.error("Failed to save private chats to localStorage:", e);
        }
    }, [chats, storageKey]);

    // Set default agent when agents are loaded
    useEffect(() => {
        if (agents.length > 0 && !selectedAgentId) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    const activeAgent = useMemo(() => {
        return agents.find((a) => a.id === selectedAgentId) || agents[0] || null;
    }, [agents, selectedAgentId]);

    const activeChat = useMemo(() => {
        return chats.find((c) => c.id === activeChatId) || null;
    }, [chats, activeChatId]);

    const handleCreateNewChat = () => {
        const newChat = {
            id: `chat_${Date.now()}`,
            title: "New Conversation",
            createdAt: new Date().toISOString(),
            agentId: activeAgent?.id || null,
            messages: [],
        };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(newChat.id);
    };

    const handleDeleteChat = (e, chatId) => {
        e.stopPropagation();
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChatId === chatId) {
            const remaining = chats.filter((c) => c.id !== chatId);
            setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
        }
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        const trimmed = inputMessage.trim();
        if (!trimmed || sending) return;

        let currentChat = activeChat;
        if (!currentChat) {
            // Auto-create chat if none active
            const newChat = {
                id: `chat_${Date.now()}`,
                title: trimmed.slice(0, 30) + (trimmed.length > 30 ? "..." : ""),
                createdAt: new Date().toISOString(),
                agentId: activeAgent?.id || null,
                messages: [],
            };
            currentChat = newChat;
            setChats((prev) => [newChat, ...prev]);
            setActiveChatId(newChat.id);
        }

        const userMsg = {
            id: `msg_${Date.now()}`,
            sender: "user",
            senderName: currentUser?.name || "You",
            content: trimmed,
            timestamp: new Date().toISOString(),
        };

        // Update title if it's the first message
        const updatedTitle =
            currentChat.messages.length === 0
                ? trimmed.slice(0, 32) + (trimmed.length > 32 ? "..." : "")
                : currentChat.title;

        // Append user message immediately
        const updatedMessages = [...currentChat.messages, userMsg];
        setChats((prev) =>
            prev.map((c) =>
                c.id === currentChat.id
                    ? { ...c, title: updatedTitle, messages: updatedMessages }
                    : c
            )
        );

        setInputMessage("");
        setSending(true);

        try {
            // If we have an active agent and active channel, execute task via real backend!
            if (activeAgent?.id && activeChannelId) {
                const response = await api.executeAgentTask({
                    projectAgentId: activeAgent.id,
                    channelId: activeChannelId,
                    task: trimmed,
                });

                const agentMsg = {
                    id: `msg_agent_${Date.now()}`,
                    sender: "agent",
                    senderName: activeAgent.displayName || activeAgent.agentDefinition?.name || "Agent",
                    content:
                        response?.message ||
                        `Task received and queued for execution:\n\`\`\`\n${trimmed}\n\`\`\`\nAgent status: ${response?.data?.status || "QUEUED"}`,
                    timestamp: new Date().toISOString(),
                };

                setChats((prev) =>
                    prev.map((c) =>
                        c.id === currentChat.id
                            ? { ...c, messages: [...updatedMessages, agentMsg] }
                            : c
                    )
                );
            } else {
                // If no agent provisioned, give helpful prompt
                const systemMsg = {
                    id: `msg_sys_${Date.now()}`,
                    sender: "agent",
                    senderName: "Private Workspace",
                    content: `Notes saved. Provision an AI agent in the Project space to execute autonomous tasks.`,
                    timestamp: new Date().toISOString(),
                };
                setChats((prev) =>
                    prev.map((c) =>
                        c.id === currentChat.id
                            ? { ...c, messages: [...updatedMessages, systemMsg] }
                            : c
                    )
                );
            }
        } catch (err) {
            const errorMsg = {
                id: `msg_err_${Date.now()}`,
                sender: "agent",
                senderName: activeAgent?.displayName || "Agent",
                content: `Task submission returned: ${err.message || "Execution error"}`,
                timestamp: new Date().toISOString(),
            };
            setChats((prev) =>
                prev.map((c) =>
                    c.id === currentChat.id
                        ? { ...c, messages: [...updatedMessages, errorMsg] }
                        : c
                )
            );
        } finally {
            setSending(false);
        }
    };

    const handlePushToChannel = async () => {
        if (!activeChat || activeChat.messages.length === 0 || !activeChannelId) return;

        const latestAgentMsg = [...activeChat.messages]
            .reverse()
            .find((m) => m.sender === "agent");

        const contentToPush = latestAgentMsg
            ? `[Shared from Private Space · ${activeChat.title}]\n${latestAgentMsg.content}`
            : `[Shared from Private Space · ${activeChat.title}]\n${activeChat.messages[activeChat.messages.length - 1].content}`;

        try {
            if (onPushToChannel) {
                await onPushToChannel(contentToPush);
            } else {
                await api.sendChannelMessage(activeChannelId, contentToPush);
            }
            setPushSuccess("Shared to channel!");
            setTimeout(() => setPushSuccess(""), 3000);
        } catch (err) {
            console.error("Failed to push to channel:", err);
        }
    };

    return (
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-white text-[#1d1c1d]">
            {/* Left Column: Recent Chats list */}
            <div className="flex w-48 shrink-0 flex-col border-r border-[#ddd] bg-[#f8f8f8]">
                <div className="p-2.5 border-b border-[#ddd]">
                    <div className="flex items-center gap-1.5 mb-2 px-0.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#3f0e40] text-[9px] font-black text-white">
                            P
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#1d1c1d]">
                                Private Space
                            </h2>
                            <p className="text-[9px] text-[#616061] truncate">
                                Saved chats & AI workspace
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleCreateNewChat}
                        className="flex w-full items-center justify-center gap-1 rounded bg-[#3f0e40] px-2 py-1 text-xs font-bold text-white transition hover:bg-[#350d36] shadow-2xs"
                    >
                        <Icon className="h-3 w-3">
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </Icon>
                        New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-1.5 space-y-0.5">
                    <div className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#616061]">
                        Saved Chats ({chats.length})
                    </div>

                    {chats.length === 0 ? (
                        <div className="p-2 text-center text-[10px] text-[#616061]">
                            No saved chats yet.
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => setActiveChatId(chat.id)}
                                className={`group flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs transition ${
                                    chat.id === activeChatId
                                        ? "bg-[#1164a3] text-white font-semibold"
                                        : "text-[#1d1c1d] hover:bg-[#eee]"
                                }`}
                            >
                                <div className="min-w-0 flex-1 pr-1">
                                    <p className="truncate text-xs">{chat.title}</p>
                                    <span
                                        className={`text-[9px] ${
                                            chat.id === activeChatId
                                                ? "text-white/70"
                                                : "text-[#616061]"
                                        }`}
                                    >
                                        {chat.messages.length} msg{chat.messages.length === 1 ? "" : "s"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-black/10 transition ${
                                        chat.id === activeChatId
                                            ? "text-white"
                                            : "text-[#616061]"
                                    }`}
                                    title="Delete chat"
                                >
                                    ✕
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Middle Column: Chat conversation */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                {/* Header */}
                <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#ddd] px-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-gradient-to-tr from-[#3f0e40] to-[#1264a3] text-[9px] font-black text-white">
                            AI
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-xs font-bold text-[#1d1c1d] truncate">
                                    {activeAgent
                                        ? `${activeAgent.displayName || activeAgent.agentDefinition?.name || "Agent"}`
                                        : "Private Workspace"}
                                </h2>
                                {activeAgent?.agentDefinition?.role && (
                                    <span className="shrink-0 rounded bg-[#ecdeec] px-1 py-0.2 text-[8px] font-bold uppercase text-[#4a154b]">
                                        {activeAgent.agentDefinition.role}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-[#616061] truncate max-w-[240px]">
                                {activeAgent?.agentDefinition?.description ||
                                    "Autonomous tasks & personal notes"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {agents.length > 1 && (
                            <select
                                value={selectedAgentId}
                                onChange={(e) => setSelectedAgentId(e.target.value)}
                                className="h-6 rounded border border-[#ddd] bg-white px-1 text-[10px] font-semibold text-[#1d1c1d] outline-none"
                            >
                                {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>
                                        {agent.displayName || agent.agentDefinition?.name} (AI)
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="button"
                            onClick={() => setDetailsOpen((v) => !v)}
                            className={`flex h-6 w-6 items-center justify-center rounded border border-[#ddd] transition ${
                                detailsOpen
                                    ? "bg-[#e8f5fa] text-[#1264a3]"
                                    : "text-[#616061] hover:bg-[#f8f8f8]"
                            }`}
                            title="Toggle Agent Details"
                        >
                            <Icon className="h-3.5 w-3.5">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 11v5" />
                                <path d="M12 7h.01" />
                            </Icon>
                        </button>
                    </div>
                </div>

                {/* Message display list */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
                    {(!activeChat || activeChat.messages.length === 0) ? (
                        <div className="flex h-full items-center justify-center text-center">
                            <div className="max-w-xs space-y-2 p-3">
                                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[#ecdeec] text-[#4a154b]">
                                    <Icon className="h-5 w-5">
                                        <path d="M12 5v14" />
                                        <path d="M5 12h14" />
                                    </Icon>
                                </div>
                                <h3 className="text-xs font-bold text-[#1d1c1d]">
                                    Private AI Assistant
                                </h3>
                                <p className="text-[10px] text-[#616061] leading-relaxed">
                                    Send code questions, execute agent tasks, or take notes. Everything is saved locally and can be pushed to your team channel anytime.
                                </p>
                            </div>
                        </div>
                    ) : (
                        activeChat.messages.map((msg) => {
                            const isUser = msg.sender === "user";
                            const parts = parseContent(msg.content);

                            return (
                                <article
                                    key={msg.id}
                                    className={`flex gap-2 text-xs ${
                                        isUser ? "flex-row-reverse" : "flex-row"
                                    }`}
                                >
                                    <div
                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white ${
                                            isUser
                                                ? "bg-[#1264a3]"
                                                : "bg-gradient-to-tr from-[#3f0e40] to-[#1264a3]"
                                        }`}
                                    >
                                        {isUser
                                            ? (currentUser?.name?.charAt(0) || "U")
                                            : "AI"}
                                    </div>

                                    <div
                                        className={`max-w-[85%] rounded px-2.5 py-1.5 ${
                                            isUser
                                                ? "bg-[#007a5a] text-white"
                                                : "border border-[#ddd] bg-[#fbfbfb] text-[#1d1c1d]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-1 mb-0.5">
                                            <span
                                                className={`text-[10px] font-bold ${
                                                    isUser ? "text-white/95" : "text-[#1d1c1d]"
                                                }`}
                                            >
                                                {msg.senderName}
                                            </span>
                                            <span
                                                className={`text-[8px] ${
                                                    isUser ? "text-white/70" : "text-[#616061]"
                                                }`}
                                            >
                                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>

                                        <div className="space-y-1 text-xs leading-relaxed">
                                            {parts.map((part, pIdx) => {
                                                if (part.type === "code") {
                                                    return (
                                                        <CodeBlock
                                                            key={pIdx}
                                                            code={part.code}
                                                            language={part.language}
                                                        />
                                                    );
                                                }
                                                return (
                                                    <p
                                                        key={pIdx}
                                                        className="whitespace-pre-wrap break-words"
                                                    >
                                                        {part.value}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-[#ddd] bg-white p-2">
                    <form
                        onSubmit={handleSendMessage}
                        className="overflow-hidden rounded border border-[#868686] bg-white shadow-2xs focus-within:border-[#1d1c1d] focus-within:shadow-[0_0_0_1px_#1d1c1d]"
                    >
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={`Message ${activeAgent?.displayName || "Agent"}...`}
                            rows={2}
                            disabled={sending}
                            className="max-h-20 min-h-[40px] w-full resize-none p-2 text-xs leading-4 text-[#1d1c1d] outline-none placeholder:text-[#616061]"
                        />

                        <div className="flex items-center justify-between border-t border-[#e8e8e8] px-2 py-1 bg-[#fafafa]">
                            <div className="flex items-center gap-1 text-[10px] text-[#616061]">
                                {activeAgent && (
                                    <span className="flex items-center gap-1 rounded bg-[#ecdeec] px-1.5 py-0.5 font-bold text-[#4a154b]">
                                        <span className="h-1 w-1 rounded-full bg-[#4a154b]" />
                                        {activeAgent.displayName || activeAgent.agentDefinition?.name}
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={!inputMessage.trim() || sending}
                                className="flex items-center gap-1 rounded bg-[#007a5a] px-2.5 py-1 text-xs font-bold text-white transition hover:bg-[#148567] disabled:opacity-50"
                            >
                                {sending ? "Sending..." : "Send"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Column: Agent profile & push to channel */}
            {detailsOpen && (
                <div className="hidden w-52 shrink-0 border-l border-[#ddd] bg-[#f8f8f8] p-3 lg:block overflow-y-auto no-scrollbar space-y-3">
                    <div>
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-tr from-[#3f0e40] to-[#1264a3] text-xs font-black text-white mb-2 shadow-2xs">
                            {activeAgent?.displayName?.charAt(0) || "A"}
                        </div>
                        <h3 className="text-xs font-bold text-[#1d1c1d]">
                            {activeAgent?.displayName || "Specialized Agent"}
                        </h3>
                        <p className="text-[10px] text-[#616061]">
                            {activeAgent?.agentDefinition?.role || "Assistant"}
                        </p>
                    </div>

                    <div className="border-t border-[#ddd] pt-2">
                        <h4 className="text-[11px] font-bold text-[#1d1c1d] mb-1">
                            Description
                        </h4>
                        <p className="text-[10px] text-[#616061] leading-relaxed">
                            {activeAgent?.agentDefinition?.description ||
                                "Configured for your team project. Executes tasks and assists with codebase workflows."}
                        </p>
                    </div>

                    {activeAgent?.agentDefinition?.model && (
                        <div className="border-t border-[#ddd] pt-2">
                            <h4 className="text-[11px] font-bold text-[#1d1c1d] mb-1">
                                Model Architecture
                            </h4>
                            <span className="inline-block rounded bg-[#e8e8e8] px-1.5 py-0.2 font-mono text-[9px] text-[#1d1c1d]">
                                {activeAgent.modelOverride || activeAgent.agentDefinition.model}
                            </span>
                        </div>
                    )}

                    <div className="border-t border-[#ddd] pt-2.5">
                        <h4 className="text-[11px] font-bold text-[#1d1c1d] mb-1">
                            Share with Team
                        </h4>
                        <p className="text-[10px] text-[#616061] mb-2">
                            Push latest response directly into current active team channel.
                        </p>
                        <button
                            type="button"
                            onClick={handlePushToChannel}
                            disabled={!activeChat || activeChat.messages.length === 0}
                            className="flex w-full items-center justify-center gap-1 rounded bg-[#1264a3] px-2 py-1 text-xs font-bold text-white transition hover:bg-[#0f548a] disabled:opacity-50"
                        >
                            <Icon className="h-3 w-3">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                <polyline points="16 6 12 2 8 6" />
                                <line x1="12" y1="2" x2="12" y2="15" />
                            </Icon>
                            Push to Channel
                        </button>
                        {pushSuccess && (
                            <p className="mt-1 text-center text-[10px] font-semibold text-[#007a5a]">
                                ✓ {pushSuccess}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrivateSpace;
