"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null
  );

function applyTheme(
  theme: Theme
): Theme {
  const root =
    document.documentElement;

  root.classList.remove(
    "light",
    "dark"
  );

  root.classList.add(theme);

  root.style.colorScheme = theme;

  return theme;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] =
    useState<Theme>("light");

  const [resolvedTheme, setResolvedTheme] =
    useState<Theme>("light");

  useEffect(() => {
    const storedTheme =
      localStorage.getItem(
        "scp-theme"
      );

    const initialTheme: Theme =
      storedTheme === "dark"
        ? "dark"
        : "light";

    setThemeState(initialTheme);

    const appliedTheme =
      applyTheme(initialTheme);

    setResolvedTheme(
      appliedTheme
    );
  }, []);

  const setTheme = (
    nextTheme: Theme
  ) => {
    localStorage.setItem(
      "scp-theme",
      nextTheme
    );

    setThemeState(nextTheme);

    const appliedTheme =
      applyTheme(nextTheme);

    setResolvedTheme(
      appliedTheme
    );
  };

  const toggleTheme = () => {
    const nextTheme =
      resolvedTheme === "dark"
        ? "light"
        : "dark";

    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}