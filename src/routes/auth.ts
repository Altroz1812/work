import 'dotenv/config';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { asyncHandler, ValidationError, AuthenticationError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router();

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenant: z.string().min(1, 'Tenant is required')
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login with tenant context
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - tenant
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@demo.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: admin123
 *               tenant:
 *                 type: string
 *                 example: demo
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                     tenant:
 *                       type: object
 *       401:
 *         description: Authentication failed
 *       400:
 *         description: Validation error
 */
router.post('/login', asyncHandler(async (req, res) => {
  // Validate input
  const validationResult = loginSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.errors[0].message);
  }

  const { email, password, tenant } = validationResult.data;

  console.log('🔐 Login attempt:', { 
    email: email.substring(0, 3) + '***', // Partially mask email for security
    tenant,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    // Find tenant with better error handling
    console.log('🔍 Looking up tenant:', tenant);
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain', tenant)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenantData) {
      console.log('❌ Tenant lookup failed:', {
        tenant,
        error: tenantError?.message || 'Tenant not found',
        ip: req.ip
      });
      throw new AuthenticationError('Invalid tenant or credentials');
    }
    console.log('✅ Tenant found:', tenantData.name);

    // Find user with rate limiting consideration
    console.log('🔍 Looking up user for tenant:', tenantData.id);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('tenant_id', tenantData.id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      console.log('❌ User lookup failed:', {
        email: email.substring(0, 3) + '***',
        tenantId: tenantData.id,
        error: userError?.message || 'User not found',
        ip: req.ip
      });
      throw new AuthenticationError('Invalid tenant or credentials');
    }
    console.log('✅ User found:', user.name, '(' + user.role + ')');

    // Verify password with timing attack protection
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Password validation:', validPassword ? 'Valid' : 'Invalid');
    
    if (!validPassword) {
      // Log failed login attempt
      console.warn('🚨 Failed login attempt:', {
        email: email.substring(0, 3) + '***',
        tenant,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      throw new AuthenticationError('Invalid tenant or credentials');
    }

    // Generate JWT with enhanced payload
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET!,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'ai-workflow-system',
        audience: tenantData.domain
      }
    );

    // Update last login timestamp
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.warn('⚠️ Failed to update last login:', updateError.message);
    }

    console.log('✅ Login successful for:', user.name, 'from IP:', req.ip);

    // Return sanitized user data
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenant_id
        },
        tenant: {
          id: tenantData.id,
          name: tenantData.name,
          domain: tenantData.domain,
          settings: tenantData.settings
        }
      }
    });
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      throw error; // Re-throw known errors
    }
    
    console.error('❌ Login error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      email: email.substring(0, 3) + '***',
      tenant,
      ip: req.ip
    });
    
    throw new AuthenticationError('Authentication service temporarily unavailable');
  }
}));

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid token
 */
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    throw new AuthenticationError('No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Optionally verify user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active')
      .eq('id', decoded.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      throw new AuthenticationError('User not found or inactive');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokenValid: true
      }
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    }
    throw error;
  }
}));

export { router as authRoutes };