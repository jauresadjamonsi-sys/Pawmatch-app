"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS } from "@/lib/i18n";

type Theme = "nuit" | "aurore" | "ocean";
type Lang = "fr" | "de" | "it" | "en";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: Record<string, string>;
}

const AppContext = createContext<AppContextType>({
  lang: "fr",
  setLang: () => {},
  theme: "nuit",
  setTheme: () => {},
  t: TRANSLATIONS.fr,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [theme, setThemeState] = useState<Theme>("nuit");

  useEffect(() => {
    const savedLang = localStorage.getItem("compaw_lang") as Lang;
    const savedTheme = localStorage.getItem("compaw_theme") as Theme;
    if (savedLang && ["fr","de","it","en"].includes(savedLang)) setLangState(savedLang);
    if (savedTheme && ["nuit","aurore","ocean"].includes(savedTheme)) setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("compaw_lang", l);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("compaw_theme", t);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, t: TRANSLATIONS[lang] }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
