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

const InviteMemberModal = ({ isOpen, onClose, tenantId }) => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError("Email address is required.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const response = await api.createInvitation(tenantId, trimmedEmail);
            setResult(response.invitation || response.data || response);
        } catch (err) {
            setError(err.message || "Failed to create invitation.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!result?.invitationLink) return;
        try {
            await navigator.clipboard.writeText(result.invitationLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // ignore
        }
    };

    const handleReset = () => {
        setEmail("");
        setResult(null);
        setError("");
        setCopied(false);
    };

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !loading) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-[500px] overflow-hidden rounded-xl border border-[#ddd] bg-white shadow-2xl text-[#1d1c1d]"
            >
                <div className="flex items-center justify-between border-b border-[#ddd] px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3f0e40] text-white">
                            <Icon className="h-5 w-5">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </Icon>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#1d1c1d]">
                                Invite Team Members
                            </h2>
                            <p className="text-xs text-[#616061]">
                                Send an invitation link to collaborate
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[#616061] transition hover:bg-[#f8f8f8] hover:text-[#1d1c1d]"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {result ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border border-[#c6e5d8] bg-[#f0f9f5] p-4 text-[#007a5a]">
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <Icon className="h-4 w-4">
                                        <polyline points="20 6 9 17 4 12" />
                                    </Icon>
                                    {result.emailDelivery?.isRealSMTP
                                        ? "Invitation Sent to Inbox via SMTP!"
                                        : "Invitation Generated (Test Sandbox Active)"}
                                </div>
                                <p className="mt-1 text-xs text-[#616061]">
                                    {result.emailDelivery?.isRealSMTP ? (
                                        <>An email was delivered to <span className="font-semibold text-[#1d1c1d]">{result.email}</span>. You can also copy the direct invitation link below.</>
                                    ) : (
                                        <>
                                            Captured in Ethereal sandbox because <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px]">SMTP_PASS</code> is not configured in <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px]">.env</code>. Share the direct invitation link below with <span className="font-semibold text-[#1d1c1d]">{result.email}</span>.
                                        </>
                                    )}
                                </p>
                                {result.emailDelivery?.previewUrl && (
                                    <div className="mt-2 pt-2 border-t border-[#c6e5d8]">
                                        <a
                                            href={result.emailDelivery.previewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs font-bold text-[#1264a3] hover:underline"
                                        >
                                            View Captured Email in Ethereal Sandbox ↗
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-[#616061]">
                                    Direct Invitation Link
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        readOnly
                                        value={result.invitationLink || ""}
                                        className="h-10 flex-1 rounded-md border border-[#868686] bg-[#f8f8f8] px-3 font-mono text-xs text-[#1d1c1d] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="flex h-10 items-center gap-1.5 rounded-md bg-[#007a5a] px-4 text-xs font-bold text-white transition hover:bg-[#148567]"
                                    >
                                        <Icon className="h-3.5 w-3.5">
                                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                        </Icon>
                                        {copied ? "Copied!" : "Copy Link"}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-[#ddd] pt-4">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="rounded-md border border-[#868686] px-4 py-2 text-xs font-bold text-[#1d1c1d] hover:bg-[#f8f8f8]"
                                >
                                    Invite Another
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-md bg-[#3f0e40] px-4 py-2 text-xs font-bold text-white hover:bg-[#350d36]"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="invite-email"
                                    className="mb-1.5 block text-sm font-black text-[#1d1c1d]"
                                >
                                    Email address
                                </label>
                                <input
                                    id="invite-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="colleague@example.com"
                                    autoFocus
                                    disabled={loading}
                                    className="h-10 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                />
                            </div>

                            {error && (
                                <p className="rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-3 py-2 text-xs text-[#b00020]">
                                    {error}
                                </p>
                            )}

                            <div className="flex justify-end gap-2 border-t border-[#ddd] pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="rounded-md px-4 py-2 text-xs font-bold text-[#1d1c1d] hover:bg-[#f8f8f8]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !email.trim()}
                                    className="flex items-center gap-1.5 rounded-md bg-[#007a5a] px-4 py-2 text-xs font-bold text-white hover:bg-[#148567] disabled:opacity-50"
                                >
                                    {loading ? "Generating..." : "Generate Invite Link"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;
