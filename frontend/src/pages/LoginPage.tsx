import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";

export function LoginPage() {
  const { user, isLoading, isMockAuth, signIn, signUp, resetAuth } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("agent@verdant.com");
  const [password, setPassword] = useState("agent123");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/agent" replace />;
  }

  async function handleQuickDemoSignIn() {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    const demoEmail = "agent@verdant.com";
    const demoPass = "agent123";
    setEmail(demoEmail);
    setPassword(demoPass);
    const result = await signIn(demoEmail, demoPass);
    if (result.error) {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  async function handleResetAuth() {
    setIsSubmitting(true);
    setError(null);
    await resetAuth();
    setNotice("Local auth session has been reset. You can now sign in fresh.");
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    if (mode === "signin") {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    } else {
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
      } else if (result.message) {
        setNotice(result.message);
      }
    }
    setIsSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Agent Access
          </p>
          {isMockAuth && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Local Mode
            </span>
          )}
        </div>

        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {mode === "signin" ? "Sign in to Agent Console" : "Create agent account"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {mode === "signin"
            ? isMockAuth
              ? "Running in local development mode. Use 1-Click Demo Login or sign in with any email."
              : "Support agents must sign in with their agent credentials."
            : "Register a new agent account."}
        </p>

        {/* 1-Click Demo Sign In */}
        <div className="mt-5 p-3 rounded-xl bg-stone-50 border border-stone-200">
          <button
            type="button"
            onClick={handleQuickDemoSignIn}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>⚡ 1-Click Demo Agent Login</span>
            <span className="text-xs bg-emerald-800/80 px-2 py-0.5 rounded-full font-mono">
              agent@verdant.com
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px bg-stone-200 flex-1" />
          <span className="text-xs uppercase text-stone-400 font-semibold tracking-wider">
            or manual credentials
          </span>
          <div className="h-px bg-stone-200 flex-1" />
        </div>

        <div className="mt-4 flex rounded-lg bg-stone-100 p-1 text-sm font-medium text-stone-600">
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 transition-colors cursor-pointer ${
              mode === "signin"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
            onClick={() => {
              setMode("signin");
              setError(null);
              setNotice(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 transition-colors cursor-pointer ${
              mode === "signup"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
            onClick={() => {
              setMode("signup");
              setError(null);
              setNotice(null);
            }}
          >
            Create account
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-stone-700">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="agent@verdant.com"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
            />
          </label>

          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 space-y-1">
              <p className="font-medium">{error}</p>
              {error.toLowerCase().includes("invalid login credentials") && (
                <p className="text-xs text-red-600">
                  Account not found in remote Supabase. Click &quot;1-Click Demo Agent Login&quot; above to bypass remote auth in development.
                </p>
              )}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <p>{notice}</p>
            </div>
          ) : null}

          <button
            className="w-full rounded-lg bg-stone-900 hover:bg-stone-800 px-4 py-2.5 font-medium text-white transition-colors cursor-pointer disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? mode === "signin"
                ? "Signing in..."
                : "Creating..."
              : mode === "signin"
                ? "Sign In with Credentials"
                : "Create Account"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <Link className="text-emerald-700 hover:text-emerald-800 underline" to="/">
            ← Back to home
          </Link>
          <button
            type="button"
            onClick={handleResetAuth}
            className="text-stone-400 hover:text-red-600 underline cursor-pointer"
            title="Clear stored session token and reset authentication state"
          >
            Reset Auth Session
          </button>
        </div>
      </section>
    </main>
  );
}
