import { useMemo, useState } from "react";

const avatarColors = [
    "bg-[#1264a3]",
    "bg-[#007a5a]",
    "bg-[#e01e5a]",
    "bg-[#4a154b]",
    "bg-[#de4e2b]",
];

const getSenderName = (message) => {
    if (message.projectAgent?.displayName) {
        return message.projectAgent.displayName;
    }

    if (message.sender?.name) {
        return message.sender.name;
    }

    if (message.sender?.firstName || message.sender?.lastName) {
        return `${message.sender.firstName || ""} ${message.sender.lastName || ""
            }`.trim();
    }

    if (message.user?.name) {
        return message.user.name;
    }

    if (message.senderType === "AGENT") {
        return "Agent";
    }

    return "Unknown user";
};

const getInitials = (name) => {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("");

    return initials.slice(0, 2).toUpperCase() || "?";
};

const getAvatarClass = (name) => {
    const total = name
        .split("")
        .reduce((sum, character) => sum + character.charCodeAt(0), 0);

    return avatarColors[total % avatarColors.length];
};

const formatMessageTime = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
};

const CodeBlock = ({ code, language }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore clipboard error
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

const Icon = ({ children }) => (
    <svg
        width="16"
        height="16"
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

const MessageItem = ({ message }) => {
    const isAgent = message.senderType === "AGENT" || Boolean(message.projectAgentId);
    const senderName = useMemo(() => getSenderName(message), [message]);
    const initials = useMemo(() => getInitials(senderName), [senderName]);
    const avatarClass = useMemo(() => {
        if (isAgent) {
            return "bg-gradient-to-tr from-[#3f0e40] to-[#1264a3]";
        }
        return getAvatarClass(senderName);
    }, [isAgent, senderName]);

    const contentParts = useMemo(
        () => parseContent(message.content),
        [message.content]
    );

    return (
        <article className="group relative flex gap-3 px-5 py-2 transition hover:bg-[#f8f8f8]">
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${avatarClass} text-xs font-black text-white shadow-sm`}
            >
                {initials}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[15px] font-black text-[#1d1c1d]">
                        {senderName}
                    </span>

                    {isAgent && (
                        <span className="inline-flex items-center rounded bg-[#ecdeec] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4a154b]">
                            AI
                        </span>
                    )}

                    <time className="text-xs text-[#616061]">
                        {formatMessageTime(message.createdAt)}
                    </time>
                </div>

                <div className="mt-0.5 space-y-1 text-[15px] leading-[22px] text-[#1d1c1d]">
                    {contentParts.map((part, index) => {
                        if (part.type === "code") {
                            return (
                                <CodeBlock
                                    key={index}
                                    code={part.code}
                                    language={part.language}
                                />
                            );
                        }
                        return (
                            <p
                                key={index}
                                className="whitespace-pre-wrap break-words"
                            >
                                {part.value}
                            </p>
                        );
                    })}
                </div>
            </div>

            <div className="absolute right-5 top-0 hidden -translate-y-1/2 items-center overflow-hidden rounded-md border border-[#ddd] bg-white shadow-sm group-hover:flex">
                <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center text-[#616061] hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                    title="Add reaction"
                    aria-label="Add reaction"
                >
                    <Icon>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <path d="M9 9h.01" />
                        <path d="M15 9h.01" />
                    </Icon>
                </button>

                <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center text-[#616061] hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                    title="More actions"
                    aria-label="More actions"
                >
                    <Icon>
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                    </Icon>
                </button>
            </div>
        </article>
    );
};

export default MessageItem;
