"use client";

import {
  LuMoon,
  LuSun,
} from "react-icons/lu";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const {
    resolvedTheme,
    toggleTheme,
  } = useTheme();

  const isDark =
    resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        isDark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      style={{
        backgroundColor:
          "var(--surface)",
        borderColor:
          "var(--border)",
        color:
          "var(--text-secondary)",
      }}
      className="
        inline-flex
        h-9
        w-9
        items-center
        justify-center
        rounded-lg
        border
        transition-all
        duration-150
        hover:bg-[var(--surface-hover)]
        hover:text-[var(--text-primary)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--primary)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--background)]
      "
    >
      {isDark ? (
        <LuSun
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      ) : (
        <LuMoon
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      )}
    </button>
  );
}