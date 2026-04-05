"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TRANSLATIONS } from "@/lib/i18n";

type Theme = "nuit" | "aurore" | "ocean" | "clair";
type ThemePreference = "auto" | Theme;
type Lang = "fr" | "de" | "it" | "en";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  themePreference: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  t: Record<string, string>;
}

export const THEME_VARS: Record<Theme, Record<string, string>> = {
    nuit:   { "--c-deep": "#0f0c1a", "--c-nav": "#130f22", "--c-card": "#1e1830", "--c-border": "#2d2545", "--c-text": "#f0eeff", "--c-text-muted": "#9b93b8", "--c-accent": "#A78BFA" },
  aurore: { "--c-deep": "#1a0f05", "--c-nav": "#150c04", "--c-card": "#261508", "--c-border": "#3d2510", "--c-text": "#fff0e0", "--c-text-muted": "#b89070", "--c-accent": "#F59E0B" },
  ocean:  { "--c-deep": "#080f1a", "--c-nav": "#060d18", "--c-card": "#0d1a2e", "--c-border": "#152840", "--c-text": "#e0f0ff", "--c-text-muted": "#7099bb", "--c-accent": "#38BDF8" },
  clair:  { "--c-deep": "#FAF8F4", "--c-nav": "#FFFFFF", "--c-card": "#FFFFFF", "--c-border": "#E8E2D9", "--c-text": "#1A1714", "--c-text-muted": "#3d3833", "--c-accent": "#EA580C" },
};

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "nuit";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "nuit" : "clair";
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === "auto" ? getSystemTheme() : preference;
}

const AppContext = createContext<AppContextType>({
  lang: "fr", setLang: () => {}, theme: "nuit", themePreference: "auto", setTheme: () => {}, t: TRANSLATIONS.fr,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [themePreference, setThemePreference] = useState<ThemePreference>("auto");
  const [effectiveTheme, setEffectiveTheme] = useState<Theme>("nuit");

  // Apply CSS variables for a given theme
  const applyThemeVars = useCallback((t: Theme) => {
    const vars = THEME_VARS[t];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
    root.setAttribute("data-theme", t);
  }, []);

  // Load saved preferences on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("pawly_lang") as Lang;
    const savedTheme = localStorage.getItem("pawly_theme") as string;
    if (savedLang && ["fr","de","it","en"].includes(savedLang)) setLangState(savedLang);

    if (savedTheme && ["auto","nuit","aurore","ocean","clair"].includes(savedTheme)) {
      const pref = savedTheme as ThemePreference;
      setThemePreference(pref);
      const resolved = resolveTheme(pref);
      setEffectiveTheme(resolved);
      applyThemeVars(resolved);
    } else {
      // Default to auto
      const resolved = resolveTheme("auto");
      setEffectiveTheme(resolved);
      applyThemeVars(resolved);
    }
  }, [applyThemeVars]);

  // Listen for system color scheme changes when preference is "auto"
  useEffect(() => {
    if (themePreference !== "auto") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const newTheme: Theme = e.matches ? "nuit" : "clair";
      setEffectiveTheme(newTheme);
      applyThemeVars(newTheme);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themePreference, applyThemeVars]);

  // Apply theme vars whenever effectiveTheme changes (for non-auto switches)
  useEffect(() => {
    applyThemeVars(effectiveTheme);
  }, [effectiveTheme, applyThemeVars]);

  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("pawly_lang", l); };

  const setTheme = (t: ThemePreference) => {
    setThemePreference(t);
    localStorage.setItem("pawly_theme", t);
    const resolved = resolveTheme(t);
    setEffectiveTheme(resolved);
    applyThemeVars(resolved);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, theme: effectiveTheme, themePreference, setTheme, t: TRANSLATIONS[lang] }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
