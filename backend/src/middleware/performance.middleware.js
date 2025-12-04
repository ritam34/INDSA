import logger from "../utils/logger.js";
import os from "os";
import v8 from "v8";

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        slow: 0,
      },
      responseTime: {
        sum: 0,
        count: 0,
        min: Infinity,
        max: 0,
        avg: 0,
      },
      endpoints: new Map(),
      errors: new Map(),
      memory: [],
      cpu: [],
    };

    this.startTime = Date.now();
  }

  trackRequest(req, res, duration) {
    this.metrics.requests.total++;

    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    if (duration > 1000) {
      this.metrics.requests.slow++;
    }

    this.metrics.responseTime.sum += duration;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.min = Math.min(
      this.metrics.responseTime.min,
      duration,
    );
    this.metrics.responseTime.max = Math.max(
      this.metrics.responseTime.max,
      duration,
    );
    this.metrics.responseTime.avg =
      this.metrics.responseTime.sum / this.metrics.responseTime.count;

    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    if (!this.metrics.endpoints.has(endpoint)) {
      this.metrics.endpoints.set(endpoint, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
      });
    }

    const endpointStats = this.metrics.endpoints.get(endpoint);
    endpointStats.count++;
    endpointStats.totalDuration += duration;
    endpointStats.avgDuration =
      endpointStats.totalDuration / endpointStats.count;
    endpointStats.minDuration = Math.min(endpointStats.minDuration, duration);
    endpointStats.maxDuration = Math.max(endpointStats.maxDuration, duration);

    if (res.statusCode >= 400) {
      endpointStats.errors++;
    }
  }

  trackError(error) {
    const errorType = error.name || "Unknown";
    const count = this.metrics.errors.get(errorType) || 0;
    this.metrics.errors.set(errorType, count + 1);
  }

  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memory.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
    });

    if (this.metrics.memory.length > 60) {
      this.metrics.memory.shift();
    }

    const cpus = os.cpus();
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + (1 - idle / total) * 100;
      }, 0) / cpus.length;

    this.metrics.cpu.push({
      timestamp: Date.now(),
      usage: cpuUsage,
    });

    if (this.metrics.cpu.length > 60) {
      this.metrics.cpu.shift();
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    return {
      uptime: Math.floor(uptime / 1000),
      requests: this.metrics.requests,
      responseTime: {
        avg: Math.round(this.metrics.responseTime.avg),
        min:
          this.metrics.responseTime.min === Infinity
            ? 0
            : this.metrics.responseTime.min,
        max: this.metrics.responseTime.max,
      },
      topEndpoints: Array.from(this.metrics.endpoints.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([endpoint, stats]) => ({
          endpoint,
          ...stats,
          avgDuration: Math.round(stats.avgDuration),
        })),
      slowestEndpoints: Array.from(this.metrics.endpoints.entries())
        .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
        .slice(0, 10)
        .map(([endpoint, stats]) => ({
          endpoint,
          avgDuration: Math.round(stats.avgDuration),
          count: stats.count,
        })),
      errors: Object.fromEntries(this.metrics.errors),
      memory: {
        current: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
        },
        heap: {
          limit: `${Math.round(heapStats.heap_size_limit / 1024 / 1024)} MB`,
          used: `${Math.round(heapStats.used_heap_size / 1024 / 1024)} MB`,
        },
        history: this.metrics.memory.slice(-10),
      },
      cpu: {
        current: os.loadavg()[0].toFixed(2),
        cores: os.cpus().length,
        history: this.metrics.cpu.slice(-10),
      },
      system: {
        platform: os.platform(),
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
        nodeVersion: process.version,
      },
    };
  }

  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, slow: 0 },
      responseTime: { sum: 0, count: 0, min: Infinity, max: 0, avg: 0 },
      endpoints: new Map(),
      errors: new Map(),
      memory: [],
      cpu: [],
    };
    this.startTime = Date.now();
  }
}

const monitor = new PerformanceMonitor();

export const performanceMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    monitor.trackRequest(req, res, duration);
  });

  next();
};

export const errorTrackingMiddleware = (err, req, res, next) => {
  monitor.trackError(err);
  next(err);
};

export const getPerformanceMetrics = (req, res) => {
  const metrics = monitor.getMetrics();

  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
};

export const startMetricsCollection = (intervalMs = 60000) => {
  setInterval(() => {
    monitor.collectSystemMetrics();

    const metrics = monitor.getMetrics();
    logger.performance("Performance metrics", {
      requests: metrics.requests,
      avgResponseTime: metrics.responseTime.avg,
      memoryUsed: metrics.memory.current.heapUsed,
      cpuLoad: metrics.cpu.current,
    });
  }, intervalMs);

  logger.info("Performance metrics collection started", {
    interval: `${intervalMs / 1000}s`,
  });
};

export const detectMemoryLeaks = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const heapLimit = v8.getHeapStatistics().heap_size_limit;

    const heapUsagePercent = (heapUsed / heapLimit) * 100;

    if (heapUsagePercent > 90) {
      logger.error("CRITICAL: Memory usage exceeds 90%", {
        heapUsed: `${Math.round(heapUsed / 1024 / 1024)} MB`,
        heapLimit: `${Math.round(heapLimit / 1024 / 1024)} MB`,
        percentage: `${heapUsagePercent.toFixed(2)}%`,
      });
    } else if (heapUsagePercent > 80) {
      logger.warn("WARNING: High memory usage detected", {
        heapUsed: `${Math.round(heapUsed / 1024 / 1024)} MB`,
        percentage: `${heapUsagePercent.toFixed(2)}%`,
      });
    }
  }, 30000);
};

export const monitorCPUUsage = () => {
  setInterval(() => {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;

    const loadPerCPU = loadAvg[0] / cpuCount;

    if (loadPerCPU > 0.9) {
      logger.error("CRITICAL: High CPU usage", {
        loadAvg: loadAvg[0].toFixed(2),
        cpuCount,
        loadPerCPU: loadPerCPU.toFixed(2),
      });
    } else if (loadPerCPU > 0.7) {
      logger.warn("WARNING: Elevated CPU usage", {
        loadAvg: loadAvg[0].toFixed(2),
        loadPerCPU: loadPerCPU.toFixed(2),
      });
    }
  }, 60000);
};

export const initializePerformanceMonitoring = () => {
  startMetricsCollection();
  detectMemoryLeaks();
  monitorCPUUsage();

  logger.info("Performance monitoring initialized");
};

export { monitor };

export default {
  performanceMiddleware,
  errorTrackingMiddleware,
  getPerformanceMetrics,
  initializePerformanceMonitoring,
  monitor,
};
