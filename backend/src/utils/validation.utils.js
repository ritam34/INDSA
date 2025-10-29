export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const isValidUUID = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const sanitizeString = (str) => {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>?/gm, "").trim();
};

export const isValidDifficulty = (difficulty) => {
  const validDifficulties = ["EASY", "MEDIUM", "HARD"];
  return validDifficulties.includes(difficulty?.toUpperCase());
};

export const isValidLanguage = (language) => {
  const validLanguages = [
    "javascript",
    "python",
    "java",
    "cpp",
    "c",
    "csharp",
    "go",
    "rust",
    "typescript",
    "php",
    "ruby",
    "swift",
    "kotlin",
  ];
  return validLanguages.includes(language?.toLowerCase());
};

export const isValidStringArray = (
  arr,
  minLength = 0,
  maxLength = Infinity,
) => {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minLength || arr.length > maxLength) return false;
  return arr.every(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
};

export const isPositiveInteger = (num) => {
  return Number.isInteger(num) && num > 0;
};
export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};
