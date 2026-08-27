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

export const petAge = (birthDate: string) => {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months += today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 12) return `${Math.max(months, 0)} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "año" : "años"}`;
};

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-CR").format(new Date(`${date}T00:00:00`));
