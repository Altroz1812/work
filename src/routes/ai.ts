import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { authenticate, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(validateTenant);

// Validation schemas
const aiScoreSchema = z.object({
  caseId: z.string().uuid('Invalid case ID format'),
  borrowerData: z.record(z.any()),
  loanData: z.record(z.any())
});

const aiParseSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format'),
  documentType: z.enum(['pan_card', 'bank_statement', 'salary_slip', 'aadhar_card']),
  fileUrl: z.string().url('Invalid file URL')
});

/**
 * @swagger
 * /api/{tenant}/ai/score:
 *   post:
 *     summary: Get AI credit score with explainability
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - caseId
 *               - borrowerData
 *               - loanData
 *             properties:
 *               caseId:
 *                 type: string
 *                 format: uuid
 *               borrowerData:
 *                 type: object
 *               loanData:
 *                 type: object
 */
router.post('/score', asyncHandler(async (req: AuthRequest, res) => {
  // Validate input
  const validationResult = aiScoreSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.errors[0].message);
  }

  const { caseId, borrowerData, loanData } = validationResult.data;

  // Verify case exists and belongs to tenant
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('id, current_stage, status')
    .eq('id', caseId)
    .eq('tenant_id', req.user!.tenantId)
    .single();

  if (caseError || !caseData) {
    throw new ValidationError('Invalid case ID or access denied');
  }

  // Enhanced mock AI scoring logic with realistic business rules
  const creditScore = borrowerData?.creditScore || 650;
  const monthlyIncome = borrowerData?.monthlyIncome || 50000;
  const requestedAmount = loanData?.requestedAmount || 100000;
  const existingLoans = borrowerData?.existingLoans || 0;
  const employmentStability = borrowerData?.employmentType === 'Salaried' ? 1 : 0.7;

  // Calculate PD score based on multiple factors
  let pdScore = 0.1; // Base risk
  
  // Credit score impact
  if (creditScore > 750) pdScore -= 0.05;
  else if (creditScore < 600) pdScore += 0.1;
  
  // Income to loan ratio impact
  const incomeRatio = requestedAmount / (monthlyIncome * 12);
  if (incomeRatio > 0.5) pdScore += 0.08;
  else if (incomeRatio < 0.2) pdScore -= 0.03;
  
  // Existing loans impact
  pdScore += existingLoans * 0.02;
  
  // Employment stability
  pdScore -= (employmentStability - 0.5) * 0.1;
  
  // Ensure PD score is within reasonable bounds
  pdScore = Math.max(0.01, Math.min(0.5, pdScore));
  
  const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0 range

  const input = {
    borrowerData,
    loanData,
    timestamp: new Date().toISOString(),
    modelVersion: 'credit_scoring_v1.2'
  };

  const output = {
    pd_score: pdScore,
    risk_grade: pdScore < 0.05 ? 'Low' : pdScore < 0.15 ? 'Medium' : 'High',
    recommendation: pdScore < 0.05 ? 'Auto Approve' : pdScore < 0.15 ? 'Manual Review' : 'Reject',
    confidence_level: confidence > 0.9 ? 'High' : confidence > 0.7 ? 'Medium' : 'Low'
  };

  const explainability = {
    top_features: [
      { feature: 'credit_score', importance: 0.35, value: creditScore, impact: creditScore > 700 ? 'Positive' : 'Negative' },
      { feature: 'monthly_income', importance: 0.25, value: monthlyIncome, impact: 'Positive' },
      { feature: 'income_to_loan_ratio', importance: 0.20, value: incomeRatio.toFixed(2), impact: incomeRatio < 0.3 ? 'Positive' : 'Negative' },
      { feature: 'employment_stability', importance: 0.15, value: employmentStability, impact: 'Positive' },
      { feature: 'existing_loans', importance: 0.05, value: existingLoans, impact: existingLoans === 0 ? 'Positive' : 'Negative' }
    ],
    model_confidence: confidence,
    data_quality_score: 0.95
  };

  try {
    // Log model run
    const { data: modelRun, error: modelError } = await supabase
      .from('model_runs')
      .insert({
        tenant_id: req.user!.tenantId,
        model_name: 'credit_scoring_v1',
        model_version: '1.2.0',
        input,
        output,
        confidence,
        explainability,
        case_id: caseId
      })
      .select()
      .single();

    if (modelError) {
      console.error('❌ Failed to log model run:', modelError);
    } else {
      console.log('✅ Model run logged:', modelRun.id);
    }

    res.json({
      success: true,
      data: {
        model_run_id: modelRun?.id,
        pd_score: pdScore,
        confidence,
        explainability,
        recommendation: output.recommendation,
        risk_grade: output.risk_grade,
        processing_time: Math.floor(Math.random() * 3000) + 500 // Mock processing time
      }
    });
  } catch (error) {
    console.error('❌ AI scoring failed:', error);
    throw new Error('AI scoring service temporarily unavailable');
  }
}));

/**
 * @swagger
 * /api/{tenant}/ai/parse:
 *   post:
 *     summary: Parse document with AI extraction
 *     tags: [AI Services]
 *     security:
 *       - bearerAuth: []
 */
router.post('/parse', asyncHandler(async (req: AuthRequest, res) => {
  // Validate input
  const validationResult = aiParseSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.errors[0].message);
  }

  const { documentId, documentType, fileUrl } = validationResult.data;

  // Enhanced mock document parsing with realistic extracted data
  const mockExtractedData = {
    document_type: documentType,
    extracted_fields: documentType === 'pan_card' ? {
      pan_number: 'ABCDE1234F',
      name: 'John Doe',
      father_name: 'Robert Doe',
      date_of_birth: '01/01/1990',
      confidence_scores: {
        pan_number: 0.98,
        name: 0.95,
        father_name: 0.92,
        date_of_birth: 0.89
      }
    } : documentType === 'bank_statement' ? {
      account_number: '1234567890',
      account_holder: 'John Doe',
      bank_name: 'ABC Bank',
      average_balance: 75000,
      transactions_count: 45,
      statement_period: '6 months',
      confidence_scores: {
        account_number: 0.99,
        account_holder: 0.96,
        bank_name: 0.94,
        average_balance: 0.91
      }
    } : documentType === 'salary_slip' ? {
      employee_name: 'John Doe',
      employer: 'XYZ Corporation',
      designation: 'Software Engineer',
      gross_salary: 60000,
      net_salary: 48000,
      month_year: 'December 2024',
      confidence_scores: {
        employee_name: 0.97,
        gross_salary: 0.93,
        net_salary: 0.95
      }
    } : {
      aadhar_number: '1234-5678-9012',
      name: 'John Doe',
      date_of_birth: '01/01/1990',
      address: '123 Main Street, City, State - 123456',
      confidence_scores: {
        aadhar_number: 0.96,
        name: 0.94,
        address: 0.88
      }
    },
    processing_metadata: {
      pages_processed: 1,
      text_regions_detected: 15,
      processing_time_ms: Math.floor(Math.random() * 5000) + 1000
    }
  };

  const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0 range

  try {
    // Log document extraction
    const { error: extractionError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extracted_data: mockExtractedData,
        confidence_score: confidence,
        model_used: 'document_ai_v1.3'
      });

    if (extractionError) {
      console.error('❌ Failed to log document extraction:', extractionError);
    }

    // Log model run
    const { data: modelRun, error: modelError } = await supabase
      .from('model_runs')
      .insert({
        tenant_id: req.user!.tenantId,
        model_name: 'document_parser_v1',
        model_version: '1.3.0',
        input: { documentId, documentType, fileUrl },
        output: mockExtractedData,
        confidence
      })
      .select()
      .single();

    if (modelError) {
      console.error('❌ Failed to log model run:', modelError);
    }

    console.log('✅ Document parsed:', {
      documentId,
      documentType,
      confidence: confidence.toFixed(3),
      modelRunId: modelRun?.id
    });

    res.json({
      success: true,
      data: {
        model_run_id: modelRun?.id,
        extracted_data: mockExtractedData,
        confidence,
        processing_time: mockExtractedData.processing_metadata.processing_time_ms,
        quality_score: confidence > 0.9 ? 'Excellent' : confidence > 0.7 ? 'Good' : 'Fair'
      }
    });
  } catch (error) {
    console.error('❌ Document parsing failed:', error);
    throw new Error('Document parsing service temporarily unavailable');
  }
}));

export { router as aiRoutes };