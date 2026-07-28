import { BadRequestError } from "../helpers/apiError.js";
import unlinkFiles from "./fileUnlinker.js";

// middlewares/jsonParser.js
export const jsonParser = (fields = []) => {
  return (req, res, next) => {
    fields?.forEach((field) => {
      if (req.body[field]) {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (err) {
          if (req.files) {
            unlinkFiles(req.files);
          }
          if (req.file) {
            unlinkFiles(req.file);
          }
          throw new BadRequestError(null, "Invalid JSON format for array");
        }
      }
    });

    next();
  };
};
