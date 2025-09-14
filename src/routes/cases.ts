import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, validateTenant, AuthRequest, checkResourceAccess } from '../middleware/auth.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

// Validation schemas
const createCaseSchema = z.object({
  workflowId: z.string().min(1, 'Workflow ID is required'),
  data: z.record(z.any()).optional(),
  loanData: z.object({
    borrowerId: z.string().min(1),
    productId: z.string().min(1),
    requestedAmount: z.number().positive(),
    tenor: z.number().positive()
  }).optional()
});

const caseActionSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  comment: z.string().optional(),
  data: z.record(z.any()).optional()
});

/**
 * @swagger
 * /api/{tenant}/cases:
 *   post:
 *     summary: Create a new case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  // Validate input
  const validationResult = createCaseSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.errors[0].message);
  }

  const { workflowId, data: caseData, loanData } = validationResult.data;

  // Verify workflow exists and is active
  const { data: workflow, error: workflowError } = await supabase
    .from('workflow_configs')
    .select('workflow_id, name, config, is_active')
    .eq('workflow_id', workflowId)
    .eq('tenant_id', req.user!.tenantId)
    .eq('is_active', true)
    .single();

  if (workflowError || !workflow) {
    throw new ValidationError('Invalid or inactive workflow');
  }

  // Get initial stage from workflow config
  const initialStage = workflow.config?.stages?.[0]?.id || 'draft';

  try {
    // Create case
    const { data: caseResult, error: caseError } = await supabase
      .from('cases')
      .insert({
        tenant_id: req.user!.tenantId,
        workflow_id: workflowId,
        current_stage: initialStage,
        status: 'draft',
        priority: 'medium',
        created_by: req.user!.id,
        data: caseData || {},
        metadata: {
          slaDeadline: new Date(Date.now() + (workflow.config?.stages?.[0]?.slaHours || 48) * 60 * 60 * 1000),
          escalationLevel: 0,
          tags: [],
          source: 'manual'
        }
      })
      .select()
      .single();

    if (caseError) {
      throw new Error('Failed to create case: ' + caseError.message);
    }

    // Create loan case if loan data provided
    if (loanData) {
      const { error: loanError } = await supabase
        .from('loan_cases')
        .insert({
          case_id: caseResult.id,
          tenant_id: req.user!.tenantId,
          borrower_id: loanData.borrowerId,
          product_id: loanData.productId,
          requested_amount: loanData.requestedAmount,
          tenor: loanData.tenor
        });

      if (loanError) {
        // Rollback case creation if loan case fails
        await supabase.from('cases').delete().eq('id', caseResult.id);
        throw new Error('Failed to create loan case: ' + loanError.message);
      }
    }

    // Log case creation
    await supabase
      .from('case_history')
      .insert({
        case_id: caseResult.id,
        action: 'created',
        performed_by: req.user!.id,
        comment: 'Case created',
        data: { workflowId, initialStage }
      });

    console.log('✅ Case created:', caseResult.id, 'by user:', req.user!.id);

    res.status(201).json({
      success: true,
      data: caseResult,
      message: 'Case created successfully'
    });
  } catch (error) {
    console.error('❌ Case creation failed:', error);
    throw error;
  }
}));

/**
 * @swagger
 * /api/{tenant}/cases:
 *   get:
 *     summary: Get all cases with filtering and pagination
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { 
    status, 
    assignedTo, 
    priority,
    workflowId,
    page = 1, 
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = req.query;
  
  let query = supabase
    .from('cases')
    .select(`
      *,
      loan_cases(*),
      borrowers(*),
      assigned_user:users!cases_assigned_to_fkey(name),
      created_user:users!cases_created_by_fkey(name),
      workflow_configs(name)
    `, { count: 'exact' })
    .eq('tenant_id', req.user!.tenantId);

  // Apply filters
  if (status) query = query.eq('status', status);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);
  if (priority) query = query.eq('priority', priority);
  if (workflowId) query = query.eq('workflow_id', workflowId);

  // Role-based filtering
  if (req.user!.role !== 'Admin' && req.user!.role !== 'Auditor') {
    // Non-admin users can only see cases assigned to them or created by them
    query = query.or(`assigned_to.eq.${req.user!.id},created_by.eq.${req.user!.id}`);
  }

  // Pagination and sorting
  const offset = (Number(page) - 1) * Number(limit);
  query = query
    .range(offset, offset + Number(limit) - 1)
    .order(String(sortBy), { ascending: sortOrder === 'asc' });

  const { data, error, count } = await query;

  if (error) {
    console.error('❌ Failed to fetch cases:', error);
    throw new Error('Failed to fetch cases: ' + error.message);
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
 * /api/{tenant}/cases/{id}:
 *   get:
 *     summary: Get case by ID with full details
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', checkResourceAccess('case'), asyncHandler(async (req: AuthRequest, res) => {
  const { data: caseData, error } = await supabase
    .from('cases')
    .select(`
      *,
      loan_cases(*),
      borrowers(*),
      case_history(*, users(name)),
      documents(*),
      workflow_configs(name, config),
      assigned_user:users!cases_assigned_to_fkey(name, email),
      created_user:users!cases_created_by_fkey(name, email)
    `)
    .eq('id', req.params.id)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (error || !caseData) {
    throw new NotFoundError('Case not found');
  }

  res.json({
    success: true,
    data: caseData
  });
}));

/**
 * @swagger
 * /api/{tenant}/cases/{id}/action:
 *   post:
 *     summary: Perform workflow action on case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/action', checkResourceAccess('case'), asyncHandler(async (req: AuthRequest, res) => {
  // Validate input
  const validationResult = caseActionSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.errors[0].message);
  }

  const { action, comment, data: actionData } = validationResult.data;
  const caseId = req.params.id;

  // Get current case with workflow configuration
  const { data: currentCase, error: caseError } = await supabase
    .from('cases')
    .select(`
      *,
      workflow_configs(config)
    `)
    .eq('id', caseId)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (caseError || !currentCase) {
    throw new NotFoundError('Case not found');
  }

  // Get workflow configuration
  const workflowConfig = currentCase.workflow_configs?.config;
  if (!workflowConfig) {
    throw new ValidationError('Workflow configuration not found');
  }

  // Find valid transition for this action
  const validTransition = workflowConfig.transitions?.find((t: any) => 
    t.from === currentCase.current_stage && 
    t.label.toLowerCase().replace(/\s+/g, '_') === action &&
    t.roles.includes(req.user!.role)
  );

  if (!validTransition) {
    throw new ValidationError(`Action '${action}' not allowed from stage '${currentCase.current_stage}' for role '${req.user!.role}'`);
  }

  // Determine new stage and status
  let newStage = validTransition.to;
  let newStatus = currentCase.status;

  // Update status based on stage
  if (newStage === 'completed') {
    newStatus = 'completed';
  } else if (newStage === 'rejected') {
    newStatus = 'rejected';
  } else if (newStage !== 'draft') {
    newStatus = 'in_progress';
  }

  // Calculate new SLA deadline
  const targetStageConfig = workflowConfig.stages?.find((s: any) => s.id === newStage);
  const newSlaDeadline = targetStageConfig?.slaHours 
    ? new Date(Date.now() + targetStageConfig.slaHours * 60 * 60 * 1000)
    : null;

  try {
    // Update case
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        current_stage: newStage,
        status: newStatus,
        metadata: {
          ...currentCase.metadata,
          slaDeadline: newSlaDeadline,
          lastAction: action,
          lastActionBy: req.user!.id
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);

    if (updateError) {
      throw new Error('Failed to update case: ' + updateError.message);
    }

    // Log action in case history
    await supabase
      .from('case_history')
      .insert({
        case_id: caseId,
        action,
        from_stage: currentCase.current_stage,
        to_stage: newStage,
        performed_by: req.user!.id,
        comment,
        data: actionData || {}
      });

    // Execute auto-rules for the new stage
    const autoRules = workflowConfig.autoRules?.filter((rule: any) => 
      rule.stage === newStage && rule.trigger === 'onEnter'
    ) || [];

    for (const rule of autoRules) {
      try {
        console.log('🤖 Executing auto-rule:', rule.id, 'for case:', caseId);
        
        if (rule.action.startsWith('call:ai/')) {
          // Trigger AI service call
          const aiEndpoint = rule.action.replace('call:', '');
          // Implementation would call the AI service here
          console.log('🧠 Would call AI service:', aiEndpoint);
        }
      } catch (ruleError) {
        console.error('❌ Auto-rule execution failed:', rule.id, ruleError);
        // Don't fail the main action if auto-rule fails
      }
    }

    console.log('✅ Case action performed:', {
      caseId,
      action,
      fromStage: currentCase.current_stage,
      toStage: newStage,
      performedBy: req.user!.id
    });

    res.json({
      success: true,
      message: 'Action performed successfully',
      data: {
        caseId,
        newStage,
        newStatus,
        slaDeadline: newSlaDeadline
      }
    });
  } catch (error) {
    console.error('❌ Case action failed:', error);
    throw error;
  }
}));

/**
 * @swagger
 * /api/{tenant}/cases/{id}/assign:
 *   post:
 *     summary: Assign case to user
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/assign', asyncHandler(async (req: AuthRequest, res) => {
  const { assignedTo } = req.body;
  const caseId = req.params.id;

  if (!assignedTo) {
    throw new ValidationError('Assigned user ID is required');
  }

  // Verify the user exists and belongs to the same tenant
  const { data: assignedUser, error: userError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('id', assignedTo)
    .eq('tenant_id', req.user!.tenantId)
    .eq('is_active', true)
    .single();

  if (userError || !assignedUser) {
    throw new ValidationError('Invalid user for assignment');
  }

  // Update case assignment
  const { error: updateError } = await supabase
    .from('cases')
    .update({
      assigned_to: assignedTo,
      updated_at: new Date().toISOString()
    })
    .eq('id', caseId)
    .eq('tenant_id', req.user!.tenantId);

  if (updateError) {
    throw new Error('Failed to assign case: ' + updateError.message);
  }

  // Log assignment action
  await supabase
    .from('case_history')
    .insert({
      case_id: caseId,
      action: 'assigned',
      performed_by: req.user!.id,
      comment: `Case assigned to ${assignedUser.name}`,
      data: { assignedTo, assignedUserName: assignedUser.name }
    });

  console.log('✅ Case assigned:', {
    caseId,
    assignedTo: assignedUser.name,
    assignedBy: req.user!.id
  });

  res.json({
    success: true,
    message: `Case assigned to ${assignedUser.name}`,
    data: {
      assignedTo: {
        id: assignedUser.id,
        name: assignedUser.name,
        role: assignedUser.role
      }
    }
  });
}));

export { router as caseRoutes };