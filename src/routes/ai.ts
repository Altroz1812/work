import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

/**
 * @swagger
 * /api/{tenant}/ai/score:
 *   post:
 *     summary: Get AI credit score
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 */
router.post('/score', asyncHandler(async (req: AuthRequest, res) => {
  const { caseId, borrowerData, loanData } = req.body;

  // Mock AI scoring logic
  const mockScore = Math.random() * 0.3; // 0-0.3 range for PD score
  const confidence = Math.random() * 0.4 + 0.6; // 0.6-1.0 range

  const input = {
    borrowerData,
    loanData,
    timestamp: new Date().toISOString()
  };

  const output = {
    pd_score: mockScore,
    risk_grade: mockScore < 0.05 ? 'Low' : mockScore < 0.15 ? 'Medium' : 'High',
    recommendation: mockScore < 0.05 ? 'Auto Approve' : mockScore < 0.15 ? 'Manual Review' : 'Reject'
  };

  const explainability = {
    top_features: [
      { feature: 'credit_score', importance: 0.35, value: borrowerData?.creditScore || 650 },
      { feature: 'monthly_income', importance: 0.25, value: borrowerData?.monthlyIncome || 50000 },
      { feature: 'existing_loans', importance: 0.20, value: borrowerData?.existingLoans || 0 },
      { feature: 'employment_stability', importance: 0.15, value: 'Stable' },
      { feature: 'loan_amount_ratio', importance: 0.05, value: 0.3 }
    ]
  };

  // Log model run
  const { data: modelRun, error } = await supabase
    .from('model_runs')
    .insert({
      tenant_id: req.user!.tenantId,
      model_name: 'credit_scoring_v1',
      model_version: '1.0.0',
      input,
      output,
      confidence,
      explainability,
      case_id: caseId
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log model run:', error);
  }

  res.json({
    success: true,
    data: {
      model_id: modelRun?.id,
      pd_score: mockScore,
      confidence,
      explainability,
      recommendation: output.recommendation
    }
  });
}));

/**
 * @swagger
 * /api/{tenant}/ai/parse:
 *   post:
 *     summary: Parse document with AI
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 */
router.post('/parse', asyncHandler(async (req: AuthRequest, res) => {
  const { documentId, documentType, fileUrl } = req.body;

  // Mock document parsing results
  const mockExtractedData = {
    document_type: documentType,
    extracted_fields: documentType === 'pan_card' ? {
      pan_number: 'ABCDE1234F',
      name: 'John Doe',
      father_name: 'Robert Doe',
      date_of_birth: '01/01/1990'
    } : documentType === 'bank_statement' ? {
      account_number: '1234567890',
      account_holder: 'John Doe',
      bank_name: 'ABC Bank',
      average_balance: 75000,
      transactions_count: 45
    } : {
      salary: 60000,
      employer: 'XYZ Corporation',
      designation: 'Software Engineer'
    }
  };

  const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0 range

  // Log document extraction
  const { error } = await supabase
    .from('document_extractions')
    .insert({
      document_id: documentId,
      extracted_data: mockExtractedData,
      confidence_score: confidence,
      model_used: 'document_ai_v1'
    });

  if (error) {
    console.error('Failed to log document extraction:', error);
  }

  // Log model run
  await supabase
    .from('model_runs')
    .insert({
      tenant_id: req.user!.tenantId,
      model_name: 'document_parser_v1',
      model_version: '1.0.0',
      input: { documentId, documentType, fileUrl },
      output: mockExtractedData,
      confidence
    });

  res.json({
    success: true,
    data: {
      extracted_data: mockExtractedData,
      confidence,
      processing_time: Math.floor(Math.random() * 5000) + 1000 // Mock processing time
    }
  });
}));

export { router as aiRoutes };