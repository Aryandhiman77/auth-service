import logger from "../utils/logger.js";

const RequestLogger = (req, res, next) => {
  logger.info(`Received ${req.method} request to${req.url}`);
  logger.info(`Request body \n${JSON.stringify(req.body)}`);
  next();
};

export default RequestLogger;
