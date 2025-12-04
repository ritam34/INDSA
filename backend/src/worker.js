import { startAllWorkers } from "./workers/index.js";
import logger from "./utils/logger.js";

startAllWorkers()
  .then(() => {
    logger.info("Worker process started successfully");
  })
  .catch((error) => {
    logger.error("Worker process failed:", error);
    process.exit(1);
  });
