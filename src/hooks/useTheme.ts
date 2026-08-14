import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem("theme") as Theme) ?? "dark";
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme, mounted]);

  function toggle() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggle, mounted };
}

/** Call once on app boot (before React hydrates) to avoid flash */
export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = (localStorage.getItem("theme") as Theme) ?? "dark";
  applyTheme(saved);
}
