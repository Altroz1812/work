import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { authRoutes } from './routes/auth.js';
import { workflowRoutes } from './routes/workflows.js';
import { caseRoutes } from './routes/cases.js';
import { aiRoutes } from './routes/ai.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { documentRoutes } from './routes/documents.js';
import { userRoutes } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Environment validation
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Log environment status
console.log('🔧 Environment Configuration Check:');
console.log('- SUPABASE_URL:', !!process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('- DATABASE_URL:', !!process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- JWT_SECRET:', !!process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || ['https://yourdomain.com']
    : [
        'http://localhost:3001', 
        'http://localhost:3000',
        /^https:\/\/.*\.webcontainer-api\.io$/,
        /^https:\/\/.*\.local-credentialless\.webcontainer-api\.io$/
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Workflow Management System API',
      version: '1.0.0',
      description: 'Multi-tenant LOS/LMS-ready workflow management system with AI integration',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
      {
        url: process.env.PRODUCTION_URL || 'https://api.example.com',
        description: 'Production server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Workflow API Documentation'
}));

// Health check with detailed system info
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.version,
    memory: process.memoryUsage(),
    pid: process.pid
  };

  res.json(healthCheck);
});

// API routes with proper error boundaries
app.use('/api/auth', authRoutes);
app.use('/api/:tenant/workflows', workflowRoutes);
app.use('/api/:tenant/cases', caseRoutes);
app.use('/api/:tenant/ai', aiRoutes);
app.use('/api/:tenant/dashboard', dashboardRoutes);
app.use('/api/:tenant/documents', documentRoutes);
app.use('/api/:tenant/users', userRoutes);

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handling
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`🛑 Received ${signal}, starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;