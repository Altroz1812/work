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

// Log environment status
console.log('🔧 Environment check:');
console.log('- SUPABASE_URL:', !!process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('- JWT_SECRET:', !!process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || ['https://yourdomain.com']
    : [
        'http://localhost:3001', 
        'http://localhost:3000',
        /^https:\/\/.*\.webcontainer-api\.io$/,
        /^https:\/\/.*\.local-credentialless\.webcontainer-api\.io$/
      ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Workflow Management System API',
      version: '1.0.0',
      description: 'Multi-tenant LOS/LMS-ready workflow management system',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
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
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/:tenant/workflows', workflowRoutes);
app.use('/api/:tenant/cases', caseRoutes);
app.use('/api/:tenant/ai', aiRoutes);
app.use('/api/:tenant/dashboard', dashboardRoutes);
app.use('/api/:tenant/documents', documentRoutes);
app.use('/api/:tenant/users', userRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
});

export default app;