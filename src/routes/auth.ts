import { Router } from 'express';
import bcrypt from 'bcrypt';
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

  if (!email || !password || !tenant) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, and tenant are required'
    });
  }

  // Find tenant
  const { data: tenantData } = await supabase
    .from('tenants')
    .select('*')
    .eq('domain', tenant)
    .eq('is_active', true)
    .single();

  if (!tenantData) {
    return res.status(401).json({
      success: false,
      message: 'Invalid tenant'
    });
  }

  // Find user
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('tenant_id', tenantData.id)
    .eq('is_active', true)
    .single();

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check password
  const validPassword = await bcrypt.compare(password, user.password_hash);
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
}));

export { router as authRoutes };