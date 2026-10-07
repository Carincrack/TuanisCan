import { PAISES_DISPONIBLES, type Pais } from "../types/auth.types";

const NOMBRES_PAISES = (locale: string) =>
  new Intl.DisplayNames([locale.startsWith("en") ? "en" : "es"], { type: "region" });

export const opcionesDePais = (locale: string) => {
  const nombres = NOMBRES_PAISES(locale);
  return PAISES_DISPONIBLES.map((codigo): { value: Pais; label: string } => ({
    value: codigo,
    label: nombres.of(codigo) ?? codigo,
  }));
};
