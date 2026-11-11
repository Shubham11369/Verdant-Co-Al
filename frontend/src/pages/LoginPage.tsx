import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";

export function LoginPage() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/agent" replace />;
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
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Agent access
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {mode === "signin" ? "Sign in" : "Create agent account"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {mode === "signin"
            ? "Support agents must sign in with a Supabase Auth account."
            : "Register a new agent account in Supabase Auth."}
        </p>

        <div className="mt-4 flex rounded-lg bg-stone-100 p-1 text-sm font-medium text-stone-600">
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 transition-colors ${
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
            className={`flex-1 rounded-md py-1.5 transition-colors ${
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

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-stone-700">
            Email
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-emerald-600"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Password
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 outline-none focus:border-emerald-600"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          </label>

          {error ? (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 space-y-1">
              <p className="font-medium">{error}</p>
              {error.toLowerCase().includes("invalid login credentials") && (
                <p className="text-xs text-red-600">
                  If this account does not exist yet, click &quot;Create
                  account&quot; above or add the user in your Supabase
                  Authentication dashboard.
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
            className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? mode === "signin"
                ? "Signing in..."
                : "Creating..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-stone-500">
          <Link className="text-emerald-700 underline" to="/">
            Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
