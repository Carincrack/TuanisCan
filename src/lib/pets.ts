import type { VaccineStatus } from "../types/pet.types";

const DAY = 86_400_000;

export const vaccineStatus = (expirationDate: string): VaccineStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiration = new Date(`${expirationDate}T00:00:00`);
  if (expiration < today) return "vencida";
  return expiration.getTime() - today.getTime() <= 30 * DAY
    ? "pendiente"
    : "vigente";
};

/* `t` entra por parámetro en vez de llamar a `useTranslation` acá
   adentro: este archivo es una función pura, no un componente, y
   quien sí puede llamar al hook es quien la usa para pintar algo. */
export const petAge = (birthDate: string, t: (key: string, vars?: Record<string, string | number>) => string) => {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months += today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 12) {
    const count = Math.max(months, 0);
    return t(count === 1 ? "pets.ageMonthsSingular" : "pets.ageMonthsPlural", { count });
  }
  const years = Math.floor(months / 12);
  return t(years === 1 ? "pets.ageYearsSingular" : "pets.ageYearsPlural", { count: years });
};

export const formatDate = (date: string, localeTag: string) =>
  new Intl.DateTimeFormat(localeTag).format(new Date(`${date}T00:00:00`));
