"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { LuBuilding2 } from "react-icons/lu";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupStarted, setSignupStarted] = useState(false);

  useEffect(() => {
    if (!loading && user && step === "details" && !signupStarted) router.replace("/dashboard");
  }, [loading, user, step, signupStarted, router]);

  useEffect(() => () => recaptchaRef.current?.clear(), []);

  const inputClass =
    "block w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
  const labelClass = "mb-1.5 block text-sm font-medium text-[var(--text-secondary)]";

  function getRecaptcha() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "signup-recaptcha", {
        size: "invisible",
        callback: () => setError(""),
        "expired-callback": () => setError("The verification expired. Please request another code."),
      });
    }
    return recaptchaRef.current;
  }

  function firebaseMessage(value: unknown) {
    const code = value instanceof FirebaseError ? value.code : "";
    const messages: Record<string, string> = {
      "auth/email-already-in-use": "An account already exists for this email. Sign in instead.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/weak-password": "Choose a stronger password (at least 6 characters).",
      "auth/invalid-phone-number": "Enter a valid phone number with country code.",
      "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
      "auth/quota-exceeded": "Firebase SMS quota has been exceeded. Try again later.",
      "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
      "auth/captcha-check-failed": "reCAPTCHA verification failed. Refresh the page and try again.",
      "auth/popup-closed-by-user": "The Google sign-in window was closed before completion.",
      "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups and retry.",
      "auth/credential-already-in-use": "This phone number is already linked to another account.",
      "auth/provider-already-linked": "A phone number is already linked to this account.",
      "auth/code-expired": "That verification code has expired. Request a new one.",
      "auth/invalid-verification-code": "The verification code is incorrect.",
    };
    return messages[code] ?? (value instanceof Error ? value.message : "Authentication failed. Please try again.");
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedPhone = mobile.replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError("Enter a valid mobile number with country code, e.g. +919876543210.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setSignupStarted(true);
    let accountCreated = false;
    try {
      const account = await signUp(name, email, password);
      accountCreated = true;
      setStep("otp");
      const verifier = getRecaptcha();
      confirmationRef.current = await linkWithPhoneNumber(account, normalizedPhone, verifier);
      setNotice(`A verification code was sent to ${normalizedPhone}.`);
    } catch (value) {
      setError(firebaseMessage(value));
      if (!accountCreated) setSignupStarted(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    if (!confirmationRef.current) {
      setError("Your verification session has expired. Please sign in and restart signup.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmationRef.current.confirm(otp);
      await auth.currentUser?.getIdToken(true);
      router.replace("/dashboard");
    } catch (value) {
      setError(firebaseMessage(value));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignup() {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (value) {
      setError(firebaseMessage(value));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendOtp() {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Your signup session expired. Please sign in again.");
      confirmationRef.current = await linkWithPhoneNumber(currentUser, mobile.replace(/[\s()-]/g, ""), getRecaptcha());
      setNotice("A new verification code has been sent.");
    } catch (value) {
      setError(firebaseMessage(value));
    } finally {
      setSubmitting(false);
    }
  }

  function changeDetails() {
    if (auth.currentUser) {
      router.replace("/dashboard");
      return;
    }
    setError("");
    setNotice("");
    setOtp("");
    confirmationRef.current = null;
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    setSignupStarted(false);
    setStep("details");
  }

  if (loading || (user && step === "details" && !signupStarted)) {
    return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">Loading...</main>;
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
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{step === "details" ? "Create your account" : "Verify your mobile"}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {step === "details" ? "Create your workspace for smarter, sustainable urban planning." : `Enter the 6-digit code sent to ${mobile}.`}
            </p>
          </div>

          {step === "details" ? (
            <>
              <button type="button" onClick={handleGoogleSignup} disabled={submitting} className="flex min-h-11 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-60">
                <GoogleMark /> Continue with Google
              </button>
              <div className="my-6 flex items-center gap-3 text-xs font-medium text-[var(--text-muted)]"><div className="h-px flex-1 bg-[var(--border)]" /> OR SIGN UP WITH EMAIL & PHONE <div className="h-px flex-1 bg-[var(--border)]" /></div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div><label htmlFor="name" className={labelClass}>Full name</label><input id="name" name="name" type="text" autoComplete="name" placeholder="Enter your full name" value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} /></div>
                <div><label htmlFor="email" className={labelClass}>Email address</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} /></div>
                <div><label htmlFor="mobile" className={labelClass}>Mobile number</label><input id="mobile" name="mobile" type="tel" autoComplete="tel" inputMode="tel" placeholder="+919876543210" value={mobile} onChange={(event) => setMobile(event.target.value)} required className={inputClass} /><p className="mt-1.5 text-xs text-[var(--text-muted)]">Include your country code. For India, start with +91.</p></div>
                <div><label htmlFor="password" className={labelClass}>Password</label><input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required className={inputClass} /></div>
                <div><label htmlFor="confirmPassword" className={labelClass}>Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required className={inputClass} /></div>
                {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-60">{submitting ? "Creating account and sending code..." : "Continue with OTP"}</button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div><label htmlFor="otp" className={labelClass}>6-digit OTP</label><input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="Enter OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required className={`${inputClass} text-center text-xl tracking-[0.35em]`} /></div>
              {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{submitting ? "Verifying..." : "Verify phone number"}</button>
              <button type="button" onClick={resendOtp} disabled={submitting} className="w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-60">Resend OTP</button>
              <button type="button" onClick={changeDetails} disabled={submitting} className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">{auth.currentUser ? "Continue to dashboard" : "Back to account details"}</button>
            </form>
          )}
          {notice && <p role="status" className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-500">{notice}</p>}
          {step === "details" && <p className="mt-6 text-center text-sm text-[var(--text-muted)]">Already have an account? <Link href="/login" className="font-semibold text-blue-500 hover:text-blue-400">Sign in</Link></p>}
        </div>
        <div id="signup-recaptcha" />
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.9 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}
