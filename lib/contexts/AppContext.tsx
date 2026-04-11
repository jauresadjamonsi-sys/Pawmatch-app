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
  nuit: {
    "--c-deep": "#070A08",
    "--c-nav": "#0D1210",
    "--c-card": "#111A15",
    "--c-border": "rgba(74,222,128,0.08)",
    "--c-text": "#E8F5EC",
    "--c-text-muted": "#6B8F7A",
    "--c-accent": "#4ADE80",
    "--c-glass": "rgba(74,222,128,0.03)",
  },
  aurore: {
    "--c-deep": "#0A0806",
    "--c-nav": "#14110D",
    "--c-card": "#1A1610",
    "--c-border": "rgba(251,191,36,0.10)",
    "--c-text": "#F5ECD8",
    "--c-text-muted": "#8F7D5C",
    "--c-accent": "#FBBF24",
    "--c-glass": "rgba(251,191,36,0.03)",
  },
  ocean: {
    "--c-deep": "#060A0F",
    "--c-nav": "#0C1420",
    "--c-card": "#101A28",
    "--c-border": "rgba(56,189,248,0.08)",
    "--c-text": "#D8EEF8",
    "--c-text-muted": "#5C7F8F",
    "--c-accent": "#38BDF8",
    "--c-glass": "rgba(56,189,248,0.03)",
  },
  clair: {
    "--c-deep": "#F8F6F2",
    "--c-nav": "#EFEBE4",
    "--c-card": "#FFFFFF",
    "--c-border": "rgba(0,0,0,0.08)",
    "--c-text": "#1A1714",
    "--c-text-muted": "#6B6560",
    "--c-accent": "#E67E22",
    "--c-glass": "rgba(0,0,0,0.02)",
  },
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
