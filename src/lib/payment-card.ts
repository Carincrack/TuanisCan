export type CardBrand = "Visa" | "Mastercard";

export const CARD_NUMBER_LENGTH = 16;

export const cardDigits = (value: string) =>
  value.replace(/\D/g, "").slice(0, CARD_NUMBER_LENGTH);

export const formatCardNumber = (value: string) =>
  cardDigits(value).replace(/(.{4})/g, "$1 ").trim();

export const cardBrand = (value: string): CardBrand | null => {
  const digits = cardDigits(value);
  if (digits.startsWith("4")) return "Visa";

  const firstTwo = Number(digits.slice(0, 2));
  const firstFour = Number(digits.slice(0, 4));
  if (
    (digits.length >= 2 && firstTwo >= 51 && firstTwo <= 55) ||
    (digits.length >= 4 && firstFour >= 2221 && firstFour <= 2720)
  ) {
    return "Mastercard";
  }

  return null;
};

export const isValidCardNumber = (value: string) => {
  const digits = cardDigits(value);
  if (digits.length !== CARD_NUMBER_LENGTH) return false;

  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }

  return sum % 10 === 0;
};

export const parseExpiry = (value: string) => {
  const match = value.trim().match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const rawYear = Number(match[2]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const today = new Date();
  const valid = year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth() + 1);

  return valid ? { month, year } : null;
};
