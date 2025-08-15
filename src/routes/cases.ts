import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

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
  const { workflowId, data: caseData, loanData } = req.body;

  // Start transaction
  const { data: caseResult, error: caseError } = await supabase
    .from('cases')
    .insert({
      tenant_id: req.user!.tenantId,
      workflow_id: workflowId,
      current_stage: 'draft',
      status: 'draft',
      created_by: req.user!.id,
      data: caseData || {}
    })
    .select()
    .single();

  if (caseError) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create case',
      error: caseError.message
    });
  }

  // If loan data provided, create loan case
  if (loanData) {
    const { data: loanResult, error: loanError } = await supabase
      .from('loan_cases')
      .insert({
        case_id: caseResult.id,
        tenant_id: req.user!.tenantId,
        borrower_id: loanData.borrowerId,
        product_id: loanData.productId,
        requested_amount: loanData.requestedAmount,
        tenor: loanData.tenor
      })
      .select()
      .single();

    if (loanError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create loan case',
        error: loanError.message
      });
    }
  }

  // Log case creation
  await supabase
    .from('case_history')
    .insert({
      case_id: caseResult.id,
      action: 'created',
      performed_by: req.user!.id,
      comment: 'Case created'
    });

  res.status(201).json({
    success: true,
    data: caseResult
  });
}));

/**
 * @swagger
 * /api/{tenant}/cases:
 *   get:
 *     summary: Get all cases
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { status, assignedTo, page = 1, limit = 20 } = req.query;
  
  let query = supabase
    .from('cases')
    .select(`
      *,
      loan_cases(*),
      borrowers(*),
      assigned_user:users!cases_assigned_to_fkey(name),
      created_user:users!cases_created_by_fkey(name)
    `)
    .eq('tenant_id', req.user!.tenantId);

  if (status) query = query.eq('status', status);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);

  const offset = (Number(page) - 1) * Number(limit);
  query = query.range(offset, offset + Number(limit) - 1);

  const { data, error, count } = await query;

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to fetch cases',
      error: error.message
    });
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
 *     summary: Get case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { data: caseData, error } = await supabase
    .from('cases')
    .select(`
      *,
      loan_cases(*),
      borrowers(*),
      case_history(*, users(name)),
      documents(*)
    `)
    .eq('id', req.params.id)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (error || !caseData) {
    return res.status(404).json({
      success: false,
      message: 'Case not found'
    });
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
 *     summary: Perform action on case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/action', asyncHandler(async (req: AuthRequest, res) => {
  const { action, comment, data: actionData } = req.body;
  const caseId = req.params.id;

  // Get current case
  const { data: currentCase, error: caseError } = await supabase
    .from('cases')
    .select('*, workflow_configs(*)')
    .eq('id', caseId)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (caseError || !currentCase) {
    return res.status(404).json({
      success: false,
      message: 'Case not found'
    });
  }

  // Simple workflow transition logic (should be enhanced with proper workflow engine)
  let newStage = currentCase.current_stage;
  let newStatus = currentCase.status;

  // Example transitions
  if (action === 'submit' && currentCase.current_stage === 'draft') {
    newStage = 'doc_verify';
    newStatus = 'in_progress';
  } else if (action === 'approve' && currentCase.current_stage === 'doc_verify') {
    newStage = 'underwriting';
  } else if (action === 'final_approve') {
    newStage = 'completed';
    newStatus = 'completed';
  } else if (action === 'reject') {
    newStage = 'rejected';
    newStatus = 'rejected';
  }

  // Update case
  const { error: updateError } = await supabase
    .from('cases')
    .update({
      current_stage: newStage,
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', caseId);

  if (updateError) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update case',
      error: updateError.message
    });
  }

  // Log action
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

  res.json({
    success: true,
    message: 'Action performed successfully',
    data: {
      newStage,
      newStatus
    }
  });
}));

export { router as caseRoutes };