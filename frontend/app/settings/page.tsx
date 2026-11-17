
"use client";

import { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  LuBell,
  LuCheck,
  LuDatabase,
  LuEye,
  LuEyeOff,
  LuLockKeyhole,
  LuMoon,
  LuRefreshCw,
  LuSettings,
  LuSun,
  LuTrash2,
  LuWifi,
  LuWifiOff,
} from "react-icons/lu";

import AppLayout from "../../components/layout/AppLayout";
import ThemeToggle from "../../components/theme/ThemeToggle";
import { useTheme } from "../../components/theme/ThemeProvider";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../lib/firebase";
import api from "../../services/api";
import { clearAllReportStorage } from "../../lib/reportStore";

const NOTIFICATION_KEY = "scp-notification-preferences-v1";

type Preferences = {
  planningComplete: boolean;
  reportGenerated: boolean;
  planningErrors: boolean;
  emailReports: boolean;
  reportEmail: string;
};

type NotificationToggleKey =
  | "planningComplete"
  | "reportGenerated"
  | "planningErrors"
  | "emailReports";

const defaultPreferences: Preferences = {
  planningComplete: true,
  reportGenerated: true,
  planningErrors: true,
  emailReports: false,
  reportEmail: "",
};

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();

  const [backendStatus, setBackendStatus] = useState<
    "idle" | "checking" | "online" | "offline"
  >("idle");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [preferences, setPreferences] =
    useState<Preferences>(defaultPreferences);
  const [preferencesMessage, setPreferencesMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_KEY);

      if (saved) {
        const parsed: Partial<Preferences> = JSON.parse(saved);

        setPreferences({
          ...defaultPreferences,
          ...parsed,
        });
      }
    } catch {
      // Keep defaults if stored preferences are invalid.
    }
  }, []);

  const isPasswordAccount = Boolean(
    user?.providerData.some(
      (provider) => provider.providerId === "password"
    )
  );

  
  async function checkBackend() {
    setBackendStatus("checking");

    try {
      const response = await api.get("/health", {
        timeout: 5000,
      });

      if (response.data?.status === "ok") {
        setBackendStatus("online");
      } else {
        setBackendStatus("offline");
      }
    } catch (error: unknown) {
      console.error("Backend health check failed:", error);
      setBackendStatus("offline");
    }
  }


  async function handleChangePassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!user?.email) {
      setPasswordError("Please sign in again and retry.");
      return;
    }

    if (!isPasswordAccount) {
      setPasswordError(
        "This account does not use email/password sign-in. " +
          "Manage your credentials through your identity provider."
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Choose a password different from your current password."
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswords(false);

      setPasswordMessage(
        "Your password has been changed successfully."
      );
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(error.code)
          : "";

      if (
        code.includes("wrong-password") ||
        code.includes("invalid-credential")
      ) {
        setPasswordError("Your current password is incorrect.");
      } else if (code.includes("weak-password")) {
        setPasswordError(
          "Your new password is too weak. Choose a stronger one."
        );
      } else if (code.includes("requires-recent-login")) {
        setPasswordError(
          "Please sign out, sign back in, and try again."
        );
      } else {
        setPasswordError(
          "Unable to change the password. Please try again."
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handlePasswordReset() {
    setPasswordMessage("");
    setPasswordError("");

    if (!user?.email) {
      setPasswordError("Your account email could not be found.");
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, user.email);

      setPasswordMessage(
        `Password reset instructions have been requested for ${user.email}. Check your inbox.`
      );
    } catch {
      setPasswordError(
        "Unable to request a password reset. Please try again."
      );
    } finally {
      setResetLoading(false);
    }
  }

  function savePreferences() {
    setPreferencesMessage("");

    const updated: Preferences = {
      ...preferences,
      reportEmail: preferences.reportEmail.trim(),
    };

    if (
      updated.emailReports &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updated.reportEmail)
    ) {
      setPreferencesMessage("Enter a valid report email address.");
      return;
    }

    try {
      localStorage.setItem(
        NOTIFICATION_KEY,
        JSON.stringify(updated)
      );

      setPreferences(updated);

      setPreferencesMessage(
        "Notification preferences saved in this browser. Actual notifications and email delivery will be connected later."
      );
    } catch {
      setPreferencesMessage(
        "Unable to save preferences in this browser."
      );
    }
  }

  function togglePreference(key: NotificationToggleKey) {
    setPreferences((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));

    setPreferencesMessage("");
  }

  function clearReports() {
    if (
      window.confirm(
        "Clear all locally saved report artifacts? " +
          "This does not delete projects from the backend."
      )
    ) {
      clearAllReportStorage();
    }
  }

  const cardStyle = {
    backgroundColor: "var(--surface)",
    borderColor: "var(--border)",
  };

  const headingStyle = {
    color: "var(--text-primary)",
  };

  const mutedStyle = {
    color: "var(--text-secondary)",
  };

  const inputClass =
    "mt-1 block w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30";

  const inputStyle = {
    backgroundColor: "var(--surface-secondary)",
    borderColor: "var(--border)",
    color: "var(--text-primary)",
  };

  const primaryButtonStyle = {
    backgroundColor: "var(--primary)",
    color: "#ffffff",
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Page heading */}
        <section
          className="rounded-2xl border p-5 sm:p-7"
          style={cardStyle}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: "var(--primary-soft)",
                color: "var(--primary)",
              }}
            >
              <LuSettings size={20} aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--primary)" }}
              >
                System
              </p>

              <h1
                className="text-2xl font-bold sm:text-3xl"
                style={headingStyle}
              >
                Settings
              </h1>
            </div>
          </div>

          <p className="mt-3 text-sm" style={mutedStyle}>
            Manage your account, notifications, appearance and planning
            workspace.
          </p>

          <p className="mt-2 break-words text-xs" style={mutedStyle}>
            Signed in as {user?.email ?? "Unknown user"}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Appearance */}
          <section
            className="min-w-0 rounded-xl border p-5 sm:p-6"
            style={cardStyle}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LuSun
                  style={{ color: "var(--primary)" }}
                  aria-hidden="true"
                />

                <h2
                  className="text-sm font-semibold"
                  style={headingStyle}
                >
                  Appearance
                </h2>
              </div>

              <ThemeToggle />
            </div>

            <p className="mt-2 text-xs" style={mutedStyle}>
              Choose your preferred workspace theme.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["light", "dark"] as const).map((theme) => {
                const active = resolvedTheme === theme;

                return (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setTheme(theme)}
                    aria-pressed={active}
                    className="min-w-0 rounded-xl border p-4 text-left transition-colors"
                    style={{
                      backgroundColor: active
                        ? "var(--primary-soft)"
                        : "var(--surface-secondary)",
                      borderColor: active
                        ? "var(--primary-border)"
                        : "var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {theme === "light" ? (
                        <LuSun aria-hidden="true" />
                      ) : (
                        <LuMoon aria-hidden="true" />
                      )}

                      {active && <LuCheck aria-hidden="true" />}
                    </div>

                    <p
                      className="mt-3 text-sm font-semibold capitalize"
                      style={headingStyle}
                    >
                      {theme} mode
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Account security */}
          <section
            className="min-w-0 rounded-xl border p-5 sm:p-6"
            style={cardStyle}
          >
            <div className="flex items-center gap-2">
              <LuLockKeyhole
                style={{ color: "var(--primary)" }}
                aria-hidden="true"
              />

              <h2
                className="text-sm font-semibold"
                style={headingStyle}
              >
                Account &amp; Security
              </h2>
            </div>

            <p className="mt-2 text-xs" style={mutedStyle}>
              Manage the password associated with your Firebase account.
            </p>

            {!isPasswordAccount ? (
              <div
                className="mt-4 rounded-lg border p-3 text-sm leading-6"
                style={inputStyle}
              >
                This account uses Google or another sign-in provider.
                Password changes must be managed through that provider.
              </div>
            ) : (
              <form
                onSubmit={handleChangePassword}
                className="mt-4 space-y-4"
              >
                <label
                  className="block min-w-0 text-xs"
                  style={mutedStyle}
                >
                  Current password

                  <input
                    className={inputClass}
                    style={inputStyle}
                    type={showPasswords ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                    required
                  />
                </label>

                <label
                  className="block min-w-0 text-xs"
                  style={mutedStyle}
                >
                  New password

                  <input
                    className={inputClass}
                    style={inputStyle}
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(event.target.value)
                    }
                    required
                  />
                </label>

                <label
                  className="block min-w-0 text-xs"
                  style={mutedStyle}
                >
                  Confirm new password

                  <input
                    className={inputClass}
                    style={inputStyle}
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    required
                  />
                </label>

                {/* Each password control has its own row */}
                <div className="flex w-full flex-col gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((value) => !value)
                    }
                    aria-pressed={showPasswords}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: "var(--surface-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {showPasswords ? (
                      <LuEyeOff
                        className="shrink-0"
                        size={16}
                        aria-hidden="true"
                      />
                    ) : (
                      <LuEye
                        className="shrink-0"
                        size={16}
                        aria-hidden="true"
                      />
                    )}

                    <span>
                      {showPasswords ? "Hide passwords" : "Show passwords"}
                    </span>
                  </button>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    style={primaryButtonStyle}
                  >
                    {passwordLoading
                      ? "Updating..."
                      : "Change password"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handlePasswordReset()}
                    disabled={resetLoading}
                    className="flex min-h-11 w-full items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      backgroundColor: "var(--surface-secondary)",
                      borderColor: "var(--border)",
                      color: "var(--primary)",
                    }}
                  >
                    {resetLoading
                      ? "Sending request..."
                      : "Send password reset email instead"}
                  </button>
                </div>

                {passwordError && (
                  <p
                    role="alert"
                    className="break-words text-sm text-red-500"
                  >
                    {passwordError}
                  </p>
                )}

                {passwordMessage && (
                  <p
                    role="status"
                    className="break-words text-sm text-green-600"
                  >
                    {passwordMessage}
                  </p>
                )}
              </form>
            )}
          </section>

          {/* Notifications */}
          <section
            className="min-w-0 rounded-xl border p-5 sm:p-6"
            style={cardStyle}
          >
            <div className="flex items-center gap-2">
              <LuBell
                style={{ color: "var(--primary)" }}
                aria-hidden="true"
              />

              <h2
                className="text-sm font-semibold"
                style={headingStyle}
              >
                Notifications
              </h2>
            </div>

            <p className="mt-2 text-xs leading-5" style={mutedStyle}>
              Configure your notification preferences. These settings are
              saved locally in this browser.
            </p>

            <div className="mt-5 space-y-5">
              {(
                [
                  [
                    "planningComplete",
                    "Planning completed",
                    "Preference for notifications when planning finishes.",
                  ],
                  [
                    "reportGenerated",
                    "Report generated",
                    "Preference for notifications when a report is ready.",
                  ],
                  [
                    "planningErrors",
                    "Planning errors",
                    "Preference for notifications when planning fails.",
                  ],
                  [
                    "emailReports",
                    "Email reports",
                    "Prepare to receive reports by email when this feature is implemented.",
                  ],
                ] as const
              ).map(([key, label, description]) => (
                <label
                  key={key}
                  className="flex min-w-0 cursor-pointer items-start gap-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                    checked={preferences[key]}
                    onChange={() => togglePreference(key)}
                  />

                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-sm font-medium"
                      style={headingStyle}
                    >
                      {label}
                    </span>

                    <span
                      className="mt-1 block break-words text-xs leading-5"
                      style={mutedStyle}
                    >
                      {description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <label
              className="mt-5 block min-w-0 text-xs"
              style={mutedStyle}
            >
              Report recipient email

              <input
                type="email"
                className={inputClass}
                style={inputStyle}
                placeholder={user?.email ?? "you@example.com"}
                value={preferences.reportEmail}
                onChange={(event) => {
                  setPreferences((previous) => ({
                    ...previous,
                    reportEmail: event.target.value,
                  }));

                  setPreferencesMessage("");
                }}
              />
            </label>

            <div
              className="mt-4 rounded-lg border p-3 text-xs leading-5"
              style={{
                backgroundColor: "var(--surface-secondary)",
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              <p className="font-semibold" style={headingStyle}>
                Email delivery is not active yet
              </p>

              <p className="mt-1">
                Your preferences and recipient email can be saved now.
                Automatic notifications and report emails will be connected
                after report generation and backend notification support
                are implemented.
              </p>
            </div>

            {preferencesMessage && (
              <p
                role="status"
                className="mt-3 break-words text-xs leading-5"
                style={mutedStyle}
              >
                {preferencesMessage}
              </p>
            )}

            <button
              type="button"
              onClick={savePreferences}
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold sm:w-auto"
              style={primaryButtonStyle}
            >
              Save notification preferences
            </button>
          </section>

          {/* Backend connection */}
          <section
            className="min-w-0 rounded-xl border p-5 sm:p-6"
            style={cardStyle}
          >
            <div className="flex items-center gap-2">
              {backendStatus === "online" ? (
                <LuWifi
                  className="shrink-0 text-green-500"
                  aria-hidden="true"
                />
              ) : (
                <LuWifiOff
                  className="shrink-0"
                  style={{ color: "var(--primary)" }}
                  aria-hidden="true"
                />
              )}

              <h2
                className="text-sm font-semibold"
                style={headingStyle}
              >
                Backend Connection
              </h2>
            </div>

            <p className="mt-2 text-xs leading-5" style={mutedStyle}>
              Check connectivity with the Smart City Planner API.
            </p>

            <p
              className="mt-4 break-all text-sm"
              style={headingStyle}
            >
              http://127.0.0.1:8000
            </p>

            <p
              className="mt-1 break-words text-xs"
              style={mutedStyle}
            >
              {backendStatus === "checking"
                ? "Checking connection..."
                : backendStatus === "online"
                  ? "Backend is reachable"
                  : backendStatus === "offline"
                    ? "Backend is not reachable"
                    : "Connection not checked yet"}
            </p>

            <button
              type="button"
              onClick={() => void checkBackend()}
              disabled={backendStatus === "checking"}
              className="mt-4 inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60"
              style={{
                backgroundColor: "var(--surface-secondary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <LuRefreshCw
                className={
                  backendStatus === "checking" ? "animate-spin" : ""
                }
                size={14}
                aria-hidden="true"
              />

              Test connection
            </button>
          </section>

          {/* Local report storage */}
          <section
            className="min-w-0 rounded-xl border p-5 sm:p-6"
            style={cardStyle}
          >
            <div className="flex items-center gap-2">
              <LuDatabase
                style={{ color: "var(--primary)" }}
                aria-hidden="true"
              />

              <h2
                className="text-sm font-semibold"
                style={headingStyle}
              >
                Local Report Storage
              </h2>
            </div>

            <p className="mt-2 text-xs leading-5" style={mutedStyle}>
              Clear report artifacts cached in this browser. Projects stored
              on the backend will not be deleted.
            </p>

            <button
              type="button"
              onClick={clearReports}
              className="mt-4 inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: "var(--danger-border)",
                color: "var(--danger)",
              }}
            >
              <LuTrash2 size={14} aria-hidden="true" />
              Clear report cache
            </button>
          </section>

          {/* Application information */}
          <section
            className="min-w-0 rounded-xl border p-5 sm:p-6"
            style={cardStyle}
          >
            <h2
              className="text-sm font-semibold"
              style={headingStyle}
            >
              Application
            </h2>

            <div
              className="mt-4 divide-y"
              style={{ borderColor: "var(--border)" }}
            >
              {[
                ["Application", "Smart City Planner"],
                ["Frontend", "Next.js"],
                ["Theme", resolvedTheme],
                ["Authentication", "Firebase Authentication"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3"
                >
                  <span className="text-xs" style={mutedStyle}>
                    {label}
                  </span>

                  <span
                    className="max-w-full break-words text-right text-xs font-semibold"
                    style={headingStyle}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
