import { useContext } from "react";
import { I18nContext } from "../context/i18n-context";

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useTranslation debe usarse dentro de I18nProvider");
  return context;
};
