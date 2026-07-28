export default class ApiResponse {
  constructor(
    statusCode = 200,
    message = "successful response",
    data = null,
    meta = {},
  ) {
    this.success = true;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  static success(message = "Success", data = null, meta = {}) {
    return new ApiResponse(200, message, data, meta);
  }
  static created(message = "Resource created", data = null) {
    return new ApiResponse(201, message, data);
  }
  static paginated(data, page, limit, totalResults) {
    return new ApiResponse(200, "Data fetched.", data, {
      page,
      limit,
      totalResults,
      totalPages: Math.ceil(totalResults / limit),
    });
  }
}
