export const isValidProfilePhotoUrl = (value: string) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.length <= 2048 && (url.protocol === "http:" || url.protocol === "https:");
  } catch {
    return false;
  }
};
