const formatChannelName = (name) => name?.replace(/^#/, "") || "channel";

const Icon = ({ children, className = "h-4 w-4" }) => (
    <svg
        className={className}
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

const ChannelHeader = ({
    channel,
    messageCount = 0,
    detailsOpen = false,
    onToggleDetails,
}) => {
    if (!channel) {
        return null;
    }

    return (
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#ddd] bg-white px-4">
            <div className="flex min-w-0 items-center gap-2">
                <button
                    type="button"
                    className="flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-sm font-bold text-[#1d1c1d] hover:bg-[#f8f8f8]"
                    title={`#${formatChannelName(channel.name)}`}
                >
                    <span className="text-[#616061]">#</span>
                    <span className="truncate">{formatChannelName(channel.name)}</span>
                    <Icon className="h-3 w-3 text-[#616061]">
                        <path d="m6 9 6 6 6-6" />
                    </Icon>
                </button>

                <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-[#616061]">
                    <span>• {messageCount} msg{messageCount === 1 ? "" : "s"}</span>
                    {channel.description && (
                        <>
                            <span aria-hidden="true" className="text-black/20">|</span>
                            <span className="truncate max-w-[260px] text-[#868686]">{channel.description}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded text-[#616061] transition hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                    title="Start call"
                    aria-label="Start call"
                >
                    <Icon className="h-3.5 w-3.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.8a2 2 0 0 1-.45 2.11L8.05 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.31 1.84.53 2.8.66A2 2 0 0 1 22 16.92z" />
                    </Icon>
                </button>

                <button
                    type="button"
                    onClick={onToggleDetails}
                    className={`flex h-7 w-7 items-center justify-center rounded transition ${detailsOpen
                            ? "bg-[#e8f5fa] text-[#1264a3]"
                            : "text-[#616061] hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                        }`}
                    title="Channel details"
                    aria-label="Channel details"
                    aria-pressed={detailsOpen}
                >
                    <Icon className="h-3.5 w-3.5">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v5" />
                        <path d="M12 7h.01" />
                    </Icon>
                </button>
            </div>
        </header>
    );
};

export default ChannelHeader;
