import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const Logo = () => (
    <div className="grid h-10 w-10 grid-cols-2 gap-1 rounded-lg bg-white p-1 shadow-sm">
        <span className="rounded-[3px] bg-[#36c5f0]" />
        <span className="rounded-[3px] bg-[#2eb67d]" />
        <span className="rounded-[3px] bg-[#e01e5a]" />
        <span className="rounded-[3px] bg-[#ecb22e]" />
    </div>
);

const Login = () => {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        try {
            setLoading(true);

            const data = await api.login({
                email: form.email,
                password: form.password,
            });

            if (data.accessToken) {
                localStorage.setItem("accessToken", data.accessToken);
            }

            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            }

            navigate("/dashboard");
        } catch (loginError) {
            setError(loginError.message || "Unable to sign in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#3f0e40]">
            <section className="hidden w-[42%] min-w-[420px] flex-col justify-between border-r border-white/10 px-12 py-10 text-white lg:flex">
                <div>
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-2xl font-black">Workly</span>
                    </div>

                    <div className="mt-24 max-w-md">
                        <h1 className="text-5xl font-black leading-tight tracking-tight">
                            Where work conversations happen.
                        </h1>
                        <p className="mt-6 text-lg leading-7 text-white/75">
                            Sign in to open your workspaces, projects, channels, and messages in one Slack-style interface.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm text-white/75">
                    <div className="rounded-md bg-white/10 p-3">
                        <p className="font-black text-white">Projects</p>
                        <p className="mt-1">Organize work</p>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                        <p className="font-black text-white">Channels</p>
                        <p className="mt-1">Keep context</p>
                    </div>
                    <div className="rounded-md bg-white/10 p-3">
                        <p className="font-black text-white">Chat</p>
                        <p className="mt-1">Move faster</p>
                    </div>
                </div>
            </section>

            <main className="flex flex-1 items-center justify-center bg-white px-6 py-12 text-[#1d1c1d]">
                <div className="w-full max-w-md">
                    <div className="mb-10 flex items-center gap-3 lg:hidden">
                        <Logo />
                        <span className="text-2xl font-black">Workly</span>
                    </div>

                    <h2 className="text-3xl font-black tracking-tight">
                        Sign in to Workly
                    </h2>
                    <p className="mt-2 text-sm text-[#616061]">
                        Continue to your workspaces.
                    </p>

                    {error && (
                        <div className="mt-6 rounded-md border border-[#f4c7c3] bg-[#fff5f5] px-4 py-3 text-sm text-[#b00020]">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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
                            placeholder="Enter your password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="h-11 w-full rounded-md bg-[#007a5a] text-sm font-black text-white hover:bg-[#148567] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </button>
                    </form>

                    <p className="mt-7 text-center text-sm text-[#616061]">
                        New to Workly?{" "}
                        <button
                            type="button"
                            onClick={() => navigate("/register")}
                            className="font-black text-[#1264a3] hover:underline"
                        >
                            Create an account
                        </button>
                    </p>
                </div>
            </main>
        </div>
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

export default Login;
