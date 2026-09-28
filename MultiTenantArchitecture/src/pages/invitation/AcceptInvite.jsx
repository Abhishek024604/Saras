import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/api";

const Logo = () => (
    <div className="grid h-10 w-10 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const AcceptInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [invitation, setInvitation] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [error, setError] = useState("");
    const [formError, setFormError] = useState("");

    // Form inputs for new user / existing user
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadInvitationAndUser = async () => {
            try {
                setLoading(true);
                setError("");

                // 1. Fetch invitation details
                const inviteRes = await api.getInvitation(token);
                if (!isMounted) return;
                setInvitation(inviteRes.invitation);

                // 2. Check if a user is currently logged in
                const tokenInStorage = localStorage.getItem("accessToken");
                if (tokenInStorage) {
                    try {
                        const userRes = await api.getCurrentUser();
                        if (isMounted) {
                            setCurrentUser(userRes.user || userRes);
                        }
                    } catch {
                        // Token might be expired or invalid
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("refreshToken");
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || "Failed to load invitation. The link may be expired or invalid.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (token) {
            loadInvitationAndUser();
        } else {
            setError("No invitation token provided.");
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [token]);

    // Handle 1-click accept when already logged in
    const handleAcceptLoggedIn = async () => {
        try {
            setSubmitting(true);
            setFormError("");

            const res = await api.acceptInvitation(token);
            const tenantId = res.result?.tenant?.id || invitation?.tenant?.id;

            if (tenantId) {
                navigate(`/tenants/${tenantId}`);
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            setFormError(err.message || "Failed to accept invitation.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle join (registers brand new user or signs in existing user and joins tenant)
    const handleJoin = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!password) {
            setFormError("Password is required.");
            return;
        }

        if (!invitation?.userExists && !name.trim()) {
            setFormError("Full name is required to create your account.");
            return;
        }

        try {
            setSubmitting(true);

            const res = await api.joinInvitation(token, {
                name: name.trim(),
                password,
            });

            if (res.accessToken) {
                localStorage.setItem("accessToken", res.accessToken);
            }
            if (res.refreshToken) {
                localStorage.setItem("refreshToken", res.refreshToken);
            }

            const tenantId = res.tenant?.id || invitation?.tenant?.id;
            if (tenantId) {
                navigate(`/tenants/${tenantId}`);
            } else {
                navigate("/dashboard");
            }
        } catch (err) {
            setFormError(err.message || "Failed to join organization.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSignOutAndSwitch = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setCurrentUser(null);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8] text-[#1d1c1d]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#3f0e40] border-t-transparent" />
                    <p className="font-semibold text-sm text-[#616061]">
                        Loading invitation details...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !invitation) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-4 py-12">
                <div className="w-full max-w-md rounded-xl border border-[#e2e2e2] bg-white p-8 shadow-lg text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fff5f5] text-[#b00020]">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black text-[#1d1c1d]">
                        Invitation Issue
                    </h2>
                    <p className="mt-2 text-sm text-[#616061]">
                        {error || "We could not find this invitation. It may have expired or already been accepted."}
                    </p>
                    <div className="mt-6 flex flex-col gap-2">
                        <Link
                            to="/login"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-[#3f0e40] text-sm font-bold text-white transition hover:bg-[#350d36]"
                        >
                            Sign In to Workly
                        </Link>
                        <Link
                            to="/register"
                            className="inline-flex h-10 items-center justify-center rounded-md border border-[#868686] text-sm font-bold text-[#1d1c1d] transition hover:bg-[#f8f8f8]"
                        >
                            Create an Account
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const tenantName = invitation.tenant?.name || "the workspace";
    const inviteEmail = invitation.email;
    const isCurrentEmailMatching =
        currentUser && currentUser.email?.toLowerCase() === inviteEmail?.toLowerCase();

    return (
        <div className="flex min-h-screen bg-[#3f0e40]">
            {/* Left Brand Panel */}
            <section className="hidden w-[42%] min-w-[420px] flex-col justify-between border-r border-white/10 px-12 py-10 text-white lg:flex">
                <div>
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-2xl font-black">Workly</span>
                    </div>

                    <div className="mt-20 max-w-md">
                        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                            Team Invitation
                        </span>
                        <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
                            You're invited to join {tenantName}.
                        </h1>
                        <p className="mt-6 text-base leading-7 text-white/80">
                            Collaborate with your team in channels, share project docs, and run AI tasks seamlessly inside Workly.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm text-white/75">
                    <div className="rounded-md bg-white/10 p-3">
                        <p className="font-black text-white">Shared Work</p>
                        <p className="mt-1 text-xs">Channels & chats</p>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                        <p className="font-black text-white">Project Docs</p>
                        <p className="mt-1 text-xs">Organized knowledge</p>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                        <p className="font-black text-white">Fast Setup</p>
                        <p className="mt-1 text-xs">Join in seconds</p>
                    </div>
                </div>
            </section>

            {/* Right Form Card */}
            <main className="flex flex-1 items-center justify-center bg-white px-6 py-12 text-[#1d1c1d]">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="mb-6 flex items-center gap-3 lg:hidden">
                        <Logo />
                        <span className="text-2xl font-black">Workly</span>
                    </div>

                    <div className="rounded-xl border border-[#e2e2e2] bg-[#f8f8f8] p-4 mb-6">
                        <p className="text-xs uppercase font-bold tracking-wider text-[#616061]">
                            Organization Invitation
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-[#1d1c1d]">
                            {tenantName}
                        </h2>
                        <p className="mt-1 text-xs text-[#616061]">
                            Invited email: <span className="font-bold text-[#1d1c1d]">{inviteEmail}</span>
                        </p>
                    </div>

                    {formError && (
                        <div className="mb-5 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                            {formError}
                        </div>
                    )}

                    {/* SCENARIO 1: Logged in and matching email */}
                    {currentUser && isCurrentEmailMatching && (
                        <div className="space-y-5">
                            <div className="rounded-md bg-[#e8f5e9] p-4 text-[#2e7d32]">
                                <p className="text-xs font-bold uppercase tracking-wide">
                                    Signed in as
                                </p>
                                <p className="text-sm font-black">
                                    {currentUser.name} ({currentUser.email})
                                </p>
                            </div>

                            <p className="text-sm text-[#616061]">
                                Click below to accept the invitation and jump straight into <strong>{tenantName}</strong>.
                            </p>

                            <button
                                type="button"
                                onClick={handleAcceptLoggedIn}
                                disabled={submitting}
                                className="h-11 w-full rounded-md bg-[#007a5a] text-sm font-black text-white hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-60 transition"
                            >
                                {submitting ? "Joining..." : `Join ${tenantName}`}
                            </button>
                        </div>
                    )}

                    {/* SCENARIO 2: Logged in but DIFFERENT email */}
                    {currentUser && !isCurrentEmailMatching && (
                        <div className="space-y-4">
                            <div className="rounded-md border border-[#ffe0b2] bg-[#fff3e0] p-4 text-[#e65100]">
                                <p className="text-xs font-bold uppercase tracking-wide">
                                    Account Mismatch
                                </p>
                                <p className="mt-1 text-xs">
                                    You are signed in as <strong>{currentUser.email}</strong>, but this invitation was sent to <strong>{inviteEmail}</strong>.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleSignOutAndSwitch}
                                className="h-11 w-full rounded-md bg-[#3f0e40] text-sm font-bold text-white hover:bg-[#350d36] transition"
                            >
                                Sign Out & Join as {inviteEmail}
                            </button>
                        </div>
                    )}

                    {/* SCENARIO 3: Not logged in */}
                    {!currentUser && (
                        <div>
                            {invitation.userExists ? (
                                /* Existing user: prompt for password to sign in & join */
                                <div>
                                    <h3 className="text-lg font-black text-[#1d1c1d]">
                                        Welcome Back!
                                    </h3>
                                    <p className="mt-1 text-xs text-[#616061]">
                                        You already have a Workly account. Enter your password to accept the invite and join <strong>{tenantName}</strong>.
                                    </p>

                                    <form onSubmit={handleJoin} className="mt-5 space-y-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-[#616061]">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                disabled
                                                className="h-10 w-full rounded-md border border-[#ddd] bg-[#f0f0f0] px-3 text-sm text-[#555] cursor-not-allowed"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoFocus
                                                disabled={submitting}
                                                className="h-10 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || !password}
                                            className="h-11 w-full rounded-md bg-[#007a5a] text-sm font-black text-white hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-60 transition"
                                        >
                                            {submitting ? "Signing in & Joining..." : `Sign In & Join ${tenantName}`}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                /* Brand new user: enter name & password to create account & join */
                                <div>
                                    <h3 className="text-lg font-black text-[#1d1c1d]">
                                        Create Your Account
                                    </h3>
                                    <p className="mt-1 text-xs text-[#616061]">
                                        Finish setting up your profile to join <strong>{tenantName}</strong>.
                                    </p>

                                    <form onSubmit={handleJoin} className="mt-5 space-y-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-[#616061]">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                disabled
                                                className="h-10 w-full rounded-md border border-[#ddd] bg-[#f0f0f0] px-3 text-sm text-[#555] cursor-not-allowed"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Jane Doe"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                autoFocus
                                                disabled={submitting}
                                                className="h-10 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-xs font-bold text-[#1d1c1d]">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                placeholder="At least 6 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={6}
                                                disabled={submitting}
                                                className="h-10 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting || !name.trim() || !password}
                                            className="h-11 w-full rounded-md bg-[#007a5a] text-sm font-black text-white hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-60 transition"
                                        >
                                            {submitting ? "Creating Account..." : `Join ${tenantName}`}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AcceptInvite;
