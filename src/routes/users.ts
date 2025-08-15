import { Router } from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabase.js';
import { authenticate, authorize, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

/**
 * @swagger
 * /api/{tenant}/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authorize(['Admin']), asyncHandler(async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, is_active, created_at, last_login')
    .eq('tenant_id', req.user!.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @swagger
 * /api/{tenant}/users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorize(['Admin']), asyncHandler(async (req: AuthRequest, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({
      success: false,
      message: 'Email, password, name, and role are required'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({
      tenant_id: req.user!.tenantId,
      email,
      password_hash: hashedPassword,
      name,
      role
    })
    .select('id, email, name, role, is_active, created_at')
    .single();

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }

  res.status(201).json({
    success: true,
    data
  });
}));

export { router as userRoutes };