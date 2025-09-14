import 'dotenv/config';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               tenant:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, tenant } = req.body;

  console.log('🔐 Login attempt:', { email, tenant });

  if (!email || !password || !tenant) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and tenant are required'
    });
  }

  try {
    // Find tenant
    console.log('🔍 Looking up tenant:', tenant);
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain', tenant)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenantData) {
      console.log('❌ Tenant lookup failed:', tenantError?.message || 'Tenant not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid tenant'
      });
    }
    console.log('✅ Tenant found:', tenantData.name);

    // Find user
    console.log('🔍 Looking up user:', email);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('tenant_id', tenantData.id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      console.log('❌ User lookup failed:', userError?.message || 'User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    console.log('✅ User found:', user.name, '(' + user.role + ')');

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Password validation:', validPassword ? 'Valid' : 'Invalid');
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ Login successful for:', user.name);

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
        tenant: tenantData
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
}));

export { router as authRoutes };