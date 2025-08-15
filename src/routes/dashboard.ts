import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

/**
 * @swagger
 * /api/{tenant}/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
  // Get case statistics
  const { data: caseStats } = await supabase
    .from('cases')
    .select('status')
    .eq('tenant_id', req.user!.tenantId);

  const statusCounts = caseStats?.reduce((acc: any, case_item) => {
    acc[case_item.status] = (acc[case_item.status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Get loan statistics
  const { data: loanStats } = await supabase
    .from('loan_cases')
    .select('requested_amount, decision')
    .eq('tenant_id', req.user!.tenantId);

  const totalLoanAmount = loanStats?.reduce((sum, loan) => sum + (loan.requested_amount || 0), 0) || 0;

  // Get recent model runs
  const { data: recentModels } = await supabase
    .from('model_runs')
    .select('model_name, confidence, created_at')
    .eq('tenant_id', req.user!.tenantId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get SLA breach cases
  const { data: slaCases } = await supabase
    .from('cases')
    .select('id, current_stage, created_at')
    .eq('tenant_id', req.user!.tenantId)
    .eq('status', 'in_progress');

  const slaBreaches = slaCases?.filter(case_item => {
    const hoursSinceCreation = (new Date().getTime() - new Date(case_item.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation > 48; // Assuming 48 hour SLA
  }).length || 0;

  res.json({
    success: true,
    data: {
      cases: {
        total: caseStats?.length || 0,
        by_status: statusCounts,
        sla_breaches: slaBreaches
      },
      loans: {
        total_amount: totalLoanAmount,
        count: loanStats?.length || 0
      },
      ai_models: {
        recent_runs: recentModels?.length || 0,
        avg_confidence: recentModels?.reduce((sum, run) => sum + run.confidence, 0) / (recentModels?.length || 1) || 0
      }
    }
  });
}));

/**
 * @swagger
 * /api/{tenant}/dashboard/ai:
 *   get:
 *     summary: Get AI model performance metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/ai', asyncHandler(async (req: AuthRequest, res) => {
  const { data: modelRuns } = await supabase
    .from('model_runs')
    .select('*')
    .eq('tenant_id', req.user!.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  const modelStats = modelRuns?.reduce((acc: any, run) => {
    if (!acc[run.model_name]) {
      acc[run.model_name] = {
        total_runs: 0,
        avg_confidence: 0,
        confidences: []
      };
    }
    acc[run.model_name].total_runs++;
    acc[run.model_name].confidences.push(run.confidence);
    return acc;
  }, {}) || {};

  // Calculate averages
  Object.keys(modelStats).forEach(modelName => {
    const confidences = modelStats[modelName].confidences;
    modelStats[modelName].avg_confidence = confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
  });

  res.json({
    success: true,
    data: {
      model_stats: modelStats,
      recent_runs: modelRuns?.slice(0, 10) || []
    }
  });
}));

export { router as dashboardRoutes };