type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, message: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const prefix = `[${level}]`;
  if (meta !== undefined) {
    console.log(`${ts} ${prefix} ${message}`, meta);
  } else {
    console.log(`${ts} ${prefix} ${message}`);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log('INFO', msg, meta),
  warn: (msg: string, meta?: unknown) => log('WARN', msg, meta),
  error: (msg: string, meta?: unknown) => log('ERROR', msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'development') log('DEBUG', msg, meta);
  },
};
