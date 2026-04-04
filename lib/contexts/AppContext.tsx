"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS } from "@/lib/i18n";

type Theme = "nuit" | "aurore" | "ocean" | "clair";
type Lang = "fr" | "de" | "it" | "en";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: Record<string, string>;
}

const THEME_VARS: Record<Theme, Record<string, string>> = {
    nuit:   { "--c-deep": "#0f0c1a", "--c-nav": "#130f22", "--c-card": "#1e1830", "--c-border": "#2d2545", "--c-text": "#f0eeff", "--c-text-muted": "#9b93b8", "--c-accent": "#A78BFA" },
  aurore: { "--c-deep": "#1a0f05", "--c-nav": "#150c04", "--c-card": "#261508", "--c-border": "#3d2510", "--c-text": "#fff0e0", "--c-text-muted": "#b89070", "--c-accent": "#F59E0B" },
  ocean:  { "--c-deep": "#080f1a", "--c-nav": "#060d18", "--c-card": "#0d1a2e", "--c-border": "#152840", "--c-text": "#e0f0ff", "--c-text-muted": "#7099bb", "--c-accent": "#38BDF8" },
  clair:  { "--c-deep": "#FAF8F4", "--c-nav": "#FFFFFF", "--c-card": "#FFFFFF", "--c-border": "#E8E2D9", "--c-text": "#1A1714", "--c-text-muted": "#3d3833", "--c-accent": "#EA580C" },

};

const AppContext = createContext<AppContextType>({
  lang: "fr", setLang: () => {}, theme: "nuit", setTheme: () => {}, t: TRANSLATIONS.fr,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [theme, setThemeState] = useState<Theme>("nuit");

  useEffect(() => {
    const savedLang = localStorage.getItem("pawly_lang") as Lang;
    const savedTheme = localStorage.getItem("pawly_theme") as Theme;
    if (savedLang && ["fr","de","it","en"].includes(savedLang)) setLangState(savedLang);
    if (savedTheme && ["nuit","aurore","ocean","clair"].includes(savedTheme)) setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    const vars = THEME_VARS[theme];
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
  }, [theme]);

  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("pawly_lang", l); };
  const setTheme = (t: Theme) => { setThemeState(t); localStorage.setItem("pawly_theme", t); };

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, t: TRANSLATIONS[lang] }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
