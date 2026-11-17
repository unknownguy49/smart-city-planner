
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { LuBuilding2 } from "react-icons/lu";

export default function LoginPage() {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      const code = err instanceof FirebaseError ? err.code : "";

      const messages: Record<string, string> = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found": "No account exists for this email.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/too-many-requests":
          "Too many attempts. Try again later.",
      };

      setError(
        messages[code] ||
          (err instanceof Error ? err.message : "Login failed.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Google login failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setError("");
    setNotice("");

    if (!email.trim()) {
      setError(
        "Enter your email address first to reset your password."
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(
        err instanceof FirebaseError &&
          err.code === "auth/invalid-email"
          ? "Enter a valid email address."
          : "Unable to send the reset email. Check the address and try again."
      );
    }
  }

  const inputClass =
    "block w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  const labelClass =
    "mb-1.5 block text-sm font-medium text-[var(--text-secondary)]";

  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">
        Loading...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 text-[var(--text-primary)] transition-colors">
      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.22)",
              }}
            >
              <LuBuilding2 size={21} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-bold leading-5 tracking-tight text-[var(--text-primary)]">
                Smart City
              </span>
              <span className="text-[13px] font-medium leading-5 text-[var(--text-secondary)]">
                Planner
              </span>
            </span>
          </Link>

          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back
          </h1>

          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Sign in to continue working on your planning projects.
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="mt-7 flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs font-medium text-[var(--text-muted)]">
            <div className="h-px flex-1 bg-[var(--border)]" />
            OR CONTINUE WITH EMAIL
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePasswordReset}
                className="text-sm font-medium text-blue-500 hover:text-blue-400"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-500"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-blue-500 hover:text-blue-400"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="h-5 w-5 shrink-0"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.9 46.98 24.55Z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </svg>
  );
}
