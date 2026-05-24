import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { LanguageProvider } from "./i18n/index.tsx";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
