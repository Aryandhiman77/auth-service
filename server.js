import { config } from "dotenv";
config();
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import logger from "./src/utils/logger.js";
import authRoutes from "./src/routes/auth.routes.js";
import RequestLogger from "./src/middlewares/RequestLogger.js";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import cookieParser from "cookie-parser";
import errorHandler from "./src/middlewares/errorHandler.js";
import roleRoutes from "./src/routes/roles.routes.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(RequestLogger);
app.use(cookieParser());
const redisClient = new Redis(process.env.REDIS_URL);

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "rl-middleware",
  points: 10,
  duration: 2,
});
app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP:${req.ip}`);
      res.status(429).json({ success: false, message: "TOO MANY REQUESTS" });
    });
});

const sensitiveEndpointRateLimiter = rateLimit({
  windowMs: 1000 * 60 * 5,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP:${req.ip}`);
    res.status(429).json({ success: false, message: "TOO MANY REQUESTS" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});
app.use("/api/auth", sensitiveEndpointRateLimiter, authRoutes);
app.use("/api/roles", roleRoutes);
app.use(errorHandler);
app.listen(process.env.PORT, (error) => {
  if (error) {
    process.exit(1);
  }
  logger.info(`auth-service running on PORT:${process.env.PORT}`);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Exception at ${promise} Reason:${reason}`);
});
