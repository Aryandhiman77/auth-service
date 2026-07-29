export const permissionFilters = (req, res, next) => {
  const { isActive, isSystem, search } = req.query;
  const query = {};
  if (isActive) {
    query.isActive = isActive === "true" ? true : false;
  }
  if (search) {
    const keyword = search.trim();
    query.OR = [
      {
        code: {
          contains: keyword.toUpperCase(),
          mode: "insensitive",
        },
      },
      {
        name: {
          contains: keyword,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: keyword,
          mode: "insensitive",
        },
      },
    ];
    req.permission_filters = query;
  }
  next();
};
