import { GAME_TRANSLATIONS } from "./game-translations.ts";

export function translateGameMessages(
  messages: Record<string, string>,
  language?: string
): Record<string, string> {
  const translations = GAME_TRANSLATIONS[language?.toLowerCase().split(/[-_]/)[0] ?? ""];
  if (!translations) return { ...messages };
  return Object.fromEntries(
    Object.entries(messages).map(([key, value]) => [key, translations[value] || value])
  );
}
