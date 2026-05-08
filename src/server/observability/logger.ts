type LogLevel = "info" | "warn" | "error";

export type LogContext = {
  tenantId?: string;
  requestId?: string;
  correlationId?: string;
  jobId?: string;
  eventId?: string;
  operation?: string;
  error?: unknown;
};

function serializeContext(context: LogContext = {}) {
  return {
    ...context,
    error: context.error instanceof Error
      ? { name: context.error.name, message: context.error.message }
      : context.error
  };
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    ...serializeContext(context),
    timestamp: new Date().toISOString()
  };

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.info(entry);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context)
};

