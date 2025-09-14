import { Request, Response, NextFunction } from 'express';

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  ip: string;
  userAgent?: string;
  userId?: string;
  tenantId?: string;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Capture original end function
  const originalEnd = res.end;

  // Override end function to log when response is sent
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    
    const logEntry: LogEntry = {
      timestamp,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      tenantId: (req as any).user?.tenantId
    };

    // Color-coded logging based on status code
    const statusColor = res.statusCode >= 500 ? '🔴' : 
                       res.statusCode >= 400 ? '🟡' : 
                       res.statusCode >= 300 ? '🔵' : '🟢';

    const logMessage = `${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(logMessage);
    } else {
      // In production, you might want to send logs to a logging service
      console.log(JSON.stringify(logEntry));
    }

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    if (duration > 1000) { // Log slow requests (>1 second)
      console.warn(`⚠️ Slow request detected: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
    }
  });

  next();
};

// Request ID middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('X-Request-ID') || 
                   req.get('X-Correlation-ID') || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  (req as any).requestId = requestId;
  res.set('X-Request-ID', requestId);
  
  next();
};