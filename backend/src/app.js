import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware.js";
import logger from "./utils/logger.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import problemRoutes from "./routes/problem.routes.js";
import discussionRoutes from './routes/discussion.routes.js';
import playlistRoutes from './routes/playlist.routes.js';
import solutionRoutes from './routes/solution.routes.js';


const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(compression());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/problems", problemRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/solutions', solutionRoutes);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
