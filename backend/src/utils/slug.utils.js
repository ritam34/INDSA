export const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const generateUniqueSlug = (text) => {
  const baseSlug = generateSlug(text);
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
};

export const generateSlugWithRandom = (text, length = 6) => {
  const baseSlug = generateSlug(text);
  const randomString = Math.random()
    .toString(36)
    .substring(2, length + 2);
  return `${baseSlug}-${randomString}`;
};

export const isValidSlug = (slug) => {
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
};
