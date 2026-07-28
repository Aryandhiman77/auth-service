import logger from "../utils/logger.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    logger.info(`${fn.name} executing at path : ${req.originalUrl}`);
    return await fn(req, res, next);
  } catch (error) {
    logger.error(
      `${fn.name} user api error at path : ${req.originalUrl}`,
      error,
    );
    next(error);
  }
};
export default asyncHandler;
