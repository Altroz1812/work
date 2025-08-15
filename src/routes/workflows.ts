import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, authorize, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

/**
 * @swagger
 * /api/{tenant}/workflows:
 *   post:
 *     summary: Create workflow configuration
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authorize(['Admin']), asyncHandler(async (req: AuthRequest, res) => {
  const { workflowId, name, description, config } = req.body;

  const { data, error } = await supabase
    .from('workflow_configs')
    .insert({
      workflow_id: workflowId,
      tenant_id: req.user!.tenantId,
      name,
      description,
      config,
      created_by: req.user!.id
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create workflow',
      error: error.message
    });
  }

  res.status(201).json({
    success: true,
    data
  });
}));

/**
 * @swagger
 * /api/{tenant}/workflows:
 *   get:
 *     summary: Get all workflow configurations
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('workflow_configs')
    .select('*')
    .eq('tenant_id', req.user!.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to fetch workflows',
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
 * /api/{tenant}/workflows/{id}:
 *   get:
 *     summary: Get workflow configuration by ID
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('workflow_configs')
    .select('*')
    .eq('workflow_id', req.params.id)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (error || !data) {
    return res.status(404).json({
      success: false,
      message: 'Workflow not found'
    });
  }

  res.json({
    success: true,
    data
  });
}));

export { router as workflowRoutes };