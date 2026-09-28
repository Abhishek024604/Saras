import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import SuccessDialog from "../../components/SuccessDialog";

const Logo = () => (
    <div className="grid h-10 w-10 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const Register = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    const handleChange = (event) => {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            await api.register({
                name: form.name,
                email: form.email,
                password: form.password,
            });

            setShowSuccess(true);
        } catch (registerError) {
            setError(registerError.message || "Unable to create account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex min-h-screen bg-[#3f0e40]">
                <section className="hidden w-[42%] min-w-[420px] flex-col justify-between border-r border-white/10 px-12 py-10 text-white lg:flex">
                    <div>
                        <div className="flex items-center gap-3">
                            <Logo />
                            <span className="text-2xl font-black">Workly</span>
                        </div>

                        <div className="mt-24 max-w-md">
                            <h1 className="text-5xl font-black leading-tight tracking-tight">
                                Start with a workspace. Build from channels.
                            </h1>
                            <p className="mt-6 text-lg leading-7 text-white/75">
                                Create your account, then set up workspaces, projects, and channels in one consistent Slack-style flow.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-md bg-white/10 p-4 text-sm text-white/75">
                        <p className="font-black text-white">Workly</p>
                        <p className="mt-1">Team communication organized by project and channel.</p>
                    </div>
                </section>

                <main className="flex flex-1 items-center justify-center bg-white px-6 py-12 text-[#1d1c1d]">
                    <div className="w-full max-w-md">
                        <div className="mb-10 flex items-center gap-3 lg:hidden">
                            <Logo />
                            <span className="text-2xl font-black">Workly</span>
                        </div>

                        <h2 className="text-3xl font-black tracking-tight">
                            Create your account
                        </h2>
                        <p className="mt-2 text-sm text-[#616061]">
                            Join Workly and start collaborating.
                        </p>

                        {error && (
                            <div className="mt-6 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                            <Field
                                label="Full name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                            <Field
                                label="Email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                            <Field
                                label="Password"
                                name="password"
                                type="password"
                                placeholder="Create a password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                            <Field
                                label="Confirm password"
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm your password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="h-11 w-full rounded-md bg-[#007a5a] text-sm font-black text-white hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Creating account..." : "Create account"}
                            </button>
                        </form>

                        <p className="mt-7 text-center text-sm text-[#616061]">
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="font-black text-[#1264a3] hover:underline"
                            >
                                Sign in
                            </button>
                        </p>
                    </div>
                </main>
            </div>

            <SuccessDialog
                open={showSuccess}
                title="Registration successful"
                message="Your Workly account has been created successfully. You can now sign in."
                buttonText="Continue to sign in"
                onContinue={() => {
                    setShowSuccess(false);
                    navigate("/login");
                }}
            />
        </>
    );
};

const Field = ({ label, name, type, placeholder, value, onChange, required }) => (
    <div>
        <label htmlFor={name} className="mb-2 block text-sm font-black">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            className="h-11 w-full rounded-md border border-[#868686] px-3 text-sm outline-none placeholder:text-[#616061] focus:border-[#1264a3] focus:ring-2 focus:ring-[#1264a3]/20"
        />
    </div>
);

export default Register;
