export const LANGUAGE_IDS = {
  javascript: 63,      // Node.js
  python: 71,          // Python 3
  java: 62,            // Java (OpenJDK)
  cpp: 54,             // C++ (GCC)
  c: 50,               // C (GCC)
  csharp: 51,          // C# (Mono)
  go: 60,              // Go
  rust: 73,            // Rust
  typescript: 74,      // TypeScript
  php: 68,             // PHP
  ruby: 72,            // Ruby
  swift: 83,           // Swift
  kotlin: 78           // Kotlin
};

export const getLanguageId = (language) => {
  const lang = language.toLowerCase();
  return LANGUAGE_IDS[lang] || null;
};

export const STATUS_IDS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14
};

export const mapJudge0Status = (statusId) => {
  switch (statusId) {
    case STATUS_IDS.ACCEPTED:
      return 'ACCEPTED';
    case STATUS_IDS.WRONG_ANSWER:
      return 'WRONG_ANSWER';
    case STATUS_IDS.TIME_LIMIT_EXCEEDED:
      return 'TIME_LIMIT_EXCEEDED';
    case STATUS_IDS.COMPILATION_ERROR:
      return 'COMPILE_ERROR';
    case STATUS_IDS.RUNTIME_ERROR_SIGSEGV:
    case STATUS_IDS.RUNTIME_ERROR_SIGXFSZ:
    case STATUS_IDS.RUNTIME_ERROR_SIGFPE:
    case STATUS_IDS.RUNTIME_ERROR_SIGABRT:
    case STATUS_IDS.RUNTIME_ERROR_NZEC:
    case STATUS_IDS.RUNTIME_ERROR_OTHER:
      return 'RUNTIME_ERROR';
    case STATUS_IDS.IN_QUEUE:
    case STATUS_IDS.PROCESSING:
      return 'JUDGING';
    default:
      return 'INTERNAL_ERROR';
  }
};

export const JUDGE0_CONFIG = {
  baseURL: process.env.JUDGE0_API_URL,
  headers: {
    'content-type': 'application/json',
    'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
    'X-RapidAPI-Host': process.env.JUDGE0_API_HOST
  },
  timeout: 30 * 1000
};

export const EXECUTION_LIMITS = {
  cpu_time_limit: 2.0,        // 2 seconds
  cpu_extra_time: 0.5,        // 0.5 seconds
  wall_time_limit: 5.0,       // 5 seconds
  memory_limit: 128000,       // 128 MB in KB
  stack_limit: 64000,         // 64 MB in KB
  max_processes_and_or_threads: 60,
  enable_per_process_and_thread_time_limit: false,
  enable_per_process_and_thread_memory_limit: false,
  max_file_size: 1024         // 1 MB in KB
};