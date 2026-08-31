import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { RouteBackdrop } from "../components/playdiagram/RouteBackdrop";
import { buttonPrimary } from "../lib/ui";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup(username, email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4">
      <RouteBackdrop />
      <div className="relative w-full max-w-sm rounded-2xl border border-surface-border bg-surface-card p-6 shadow-raised">
        <h1 className="mb-4 text-xl font-bold text-primary-400">Create your account</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            required
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-page px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary-500/60"
          />
          {error && <p className="text-sm text-danger-400">{error}</p>}
          <button type="submit" disabled={busy} className={`${buttonPrimary} w-full`}>
            {busy ? "Creating…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary-400 hover:text-primary-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
