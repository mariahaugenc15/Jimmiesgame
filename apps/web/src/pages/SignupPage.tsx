import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";

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
    <div className="mx-auto mt-16 max-w-sm rounded-xl bg-slate-900 p-6">
      <h1 className="mb-4 text-xl font-bold text-emerald-400">Create your account</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          required
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        Already have an account? <Link to="/login" className="text-emerald-400">Log in</Link>
      </p>
    </div>
  );
}
