import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, authorize, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

// Validation schemas
const workflowStageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  slaHours: z.number().min(0),
  assignToRoles: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional()
});

const workflowTransitionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1),
  condition: z.string().min(1),
  roles: z.array(z.string()),
  actions: z.array(z.string()),
  requiresApproval: z.boolean().optional()
});

const workflowConfigSchema = z.object({
  workflowId: z.string().min(1),
  version: z.number().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  stages: z.array(workflowStageSchema).min(1),
  transitions: z.array(workflowTransitionSchema),
  autoRules: z.array(z.object({
    id: z.string(),
    stage: z.string(),
    trigger: z.enum(['onEnter', 'onExit', 'onTimer']),
    action: z.string(),
    params: z.record(z.any()),
    condition: z.string().optional()
  })).optional()
});

const createWorkflowSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional(),
  config: workflowConfigSchema
});

/**
 * @swagger
 * /api/{tenant}/workflows:
 *   post:
 *     summary: Create workflow configuration
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowId
 *               - name
 *               - config
 *             properties:
 *               workflowId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               config:
 *                 type: object
 */
router.post('/', authorize(['Admin']), asyncHandler(async (req: AuthRequest, res) => {
  // Validate input
  const validationResult = createWorkflowSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.errors[0].message);
  }

  const { workflowId, name, description, config } = validationResult.data;

  console.log('📝 Creating workflow:', { 
    workflowId, 
    name, 
    tenantId: req.user!.tenantId,
    createdBy: req.user!.id 
  });

  // Check if workflow ID already exists for this tenant
  const { data: existingWorkflow } = await supabase
    .from('workflow_configs')
    .select('workflow_id')
    .eq('workflow_id', workflowId)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (existingWorkflow) {
    throw new ValidationError(`Workflow with ID '${workflowId}' already exists`);
  }

  // Create workflow
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
    console.error('❌ Workflow creation error:', error);
    throw new Error('Failed to create workflow: ' + error.message);
  }

  console.log('✅ Workflow created successfully:', data.workflow_id);

  res.status(201).json({
    success: true,
    data,
    message: 'Workflow created successfully'
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
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 */
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { active, page = 1, limit = 20 } = req.query;
  
  let query = supabase
    .from('workflow_configs')
    .select('*, created_user:users!workflow_configs_created_by_fkey(name)', { count: 'exact' })
    .eq('tenant_id', req.user!.tenantId);

  if (active !== undefined) {
    query = query.eq('is_active', active === 'true');
  }

  const offset = (Number(page) - 1) * Number(limit);
  query = query
    .range(offset, offset + Number(limit) - 1)
    .order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Failed to fetch workflows:', error);
    throw new Error('Failed to fetch workflows: ' + error.message);
  }

  res.json({
    success: true,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count || 0,
      pages: Math.ceil((count || 0) / Number(limit))
    }
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
 *     parameters:
 *       - in: path
 *         name: tenant
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('workflow_configs')
    .select(`
      *,
      created_user:users!workflow_configs_created_by_fkey(name, email),
      cases(count)
    `)
    .eq('workflow_id', req.params.id)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Workflow not found');
  }

  res.json({
    success: true,
    data
  });
}));

/**
 * @swagger
 * /api/{tenant}/workflows/{id}:
 *   put:
 *     summary: Update workflow configuration
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authorize(['Admin']), asyncHandler(async (req: AuthRequest, res) => {
  const { name, description, config, isActive } = req.body;

  // Validate config if provided
  if (config) {
    const configValidation = workflowConfigSchema.safeParse(config);
    if (!configValidation.success) {
      throw new ValidationError('Invalid workflow configuration: ' + configValidation.error.errors[0].message);
    }
  }

  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (config) updateData.config = config;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data, error } = await supabase
    .from('workflow_configs')
    .update(updateData)
    .eq('workflow_id', req.params.id)
    .eq('tenant_id', req.user!.tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Workflow not found');
    }
    throw new Error('Failed to update workflow: ' + error.message);
  }

  console.log('✅ Workflow updated:', req.params.id, 'by user:', req.user!.id);

  res.json({
    success: true,
    data,
    message: 'Workflow updated successfully'
  });
}));

/**
 * @swagger
 * /api/{tenant}/workflows/{id}:
 *   delete:
 *     summary: Delete workflow configuration
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authorize(['Admin']), asyncHandler(async (req: AuthRequest, res) => {
  // Check if workflow has active cases
  const { data: activeCases, error: casesError } = await supabase
    .from('cases')
    .select('id')
    .eq('workflow_id', req.params.id)
    .eq('tenant_id', req.user!.tenantId)
    .neq('status', 'completed')
    .limit(1);

  if (casesError) {
    throw new Error('Failed to check for active cases');
  }

  if (activeCases && activeCases.length > 0) {
    throw new ValidationError('Cannot delete workflow with active cases. Complete or reassign all cases first.');
  }

  const { error } = await supabase
    .from('workflow_configs')
    .delete()
    .eq('workflow_id', req.params.id)
    .eq('tenant_id', req.user!.tenantId);

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Workflow not found');
    }
    throw new Error('Failed to delete workflow: ' + error.message);
  }

  console.log('🗑️ Workflow deleted:', req.params.id, 'by user:', req.user!.id);

  res.json({
    success: true,
    message: 'Workflow deleted successfully'
  });
}));

export { router as workflowRoutes };