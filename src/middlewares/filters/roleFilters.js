export const roleFilters = (req, res, next) => {
  const { status, role_code, search } = req.query;
  const query = {};
  if (status) {
    query.isActive = status.trim().toLowerCase() === "active";
  }
  if (role_code) {
    query.code = role_code.trim().toUpperCase();
  }
  if (search) {
    const keyword = search.trim();
    query.OR = [
      {
        code: {
          contains: keyword,
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
    req.role_filters = query;
  }
  next();
};
