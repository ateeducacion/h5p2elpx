import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { en, type Messages } from "./messages/en.ts";
import { es } from "./messages/es.ts";

export type Lang = "en" | "es";

const STORAGE_KEY = "h5p2elpx.lang";
const CATALOGS: Record<Lang, Messages> = { en, es };

export const SUPPORTED_LANGS: ReadonlyArray<Lang> = ["en", "es"];

export function detectLang(): Lang {
  if (typeof window !== "undefined") {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
    const nav = window.navigator?.language?.slice(0, 2).toLowerCase();
    if (nav === "es") return "es";
  }
  return "en";
}

type Vars = Record<string, string | number>;

function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

function lookup(catalog: Messages, path: string): string {
  const parts = path.split(".");
  let cur: unknown = catalog;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Vars) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage?.setItem(STORAGE_KEY, l);
    } catch {
      // ignore (private mode, etc.)
    }
  }, []);

  const value = useMemo<Ctx>(() => {
    const catalog = CATALOGS[lang];
    return {
      lang,
      setLang,
      t: (key, vars) => format(lookup(catalog, key), vars)
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
