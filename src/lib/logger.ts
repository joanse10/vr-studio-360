type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] || LOG_LEVELS.info;

function formatMessage(level: LogLevel, msg: string, obj?: unknown) {
  const timestamp = new Date().toISOString();
  if (obj !== undefined) {
    return `[${timestamp}] ${level.toUpperCase()}: ${msg} ${JSON.stringify(obj)}`;
  }
  return `[${timestamp}] ${level.toUpperCase()}: ${msg}`;
}

const logger = {
  debug: (msg: string, obj?: unknown) => {
    if (currentLevel <= LOG_LEVELS.debug) console.debug(formatMessage('debug', msg, obj));
  },
  info: (msg: string, obj?: unknown) => {
    if (currentLevel <= LOG_LEVELS.info) console.info(formatMessage('info', msg, obj));
  },
  warn: (msg: string, obj?: unknown) => {
    if (currentLevel <= LOG_LEVELS.warn) console.warn(formatMessage('warn', msg, obj));
  },
  error: (msg: string, obj?: unknown) => {
    if (currentLevel <= LOG_LEVELS.error) console.error(formatMessage('error', msg, obj));
  },
};

export default logger;
