const pagination = (req, _, next) => {
  const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) - 1 : 0;
  const limit = parseInt(req.query.limit) || 10;
  const skip = page * limit;
  req.pagination_query = { page, limit, skip };
  next();
};
export default pagination;
