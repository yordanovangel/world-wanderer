import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import i18n from "./i18n";

const syncLang = () => {
  const lng = (i18n.language || 'bg').toLowerCase().split('-')[0];
  document.documentElement.lang = lng === 'en' ? 'en' : 'bg';
};
syncLang();
i18n.on('languageChanged', syncLang);

createRoot(document.getElementById("root")!).render(<App />);

