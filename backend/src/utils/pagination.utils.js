export const getPaginationMeta = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 20;
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    previousPage: currentPage > 1 ? currentPage - 1 : null,
  };
};

export const getSkipValue = (page, limit) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 20;
  return (currentPage - 1) * itemsPerPage;
};

export const sanitizePaginationParams = (page, limit) => {
  let sanitizedPage = parseInt(page) || 1;
  let sanitizedLimit = parseInt(limit) || 20;

  if (sanitizedPage < 1) sanitizedPage = 1;

  if (sanitizedLimit > 100) sanitizedLimit = 100;
  if (sanitizedLimit < 1) sanitizedLimit = 20;

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip: (sanitizedPage - 1) * sanitizedLimit,
  };
};

export const createPaginatedResponse = (data, page, limit, total) => {
  const pagination = getPaginationMeta(page, limit, total);

  return {
    data,
    pagination,
  };
};
