import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../lib/supabase.js';
import { authenticate, validateTenant, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router({ mergeParams: true });
const upload = multer({ dest: 'uploads/' });

router.use(authenticate);
router.use(validateTenant);

/**
 * @swagger
 * /api/{tenant}/documents/upload:
 *   post:
 *     summary: Upload document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  const { caseId, borrowerId, documentType } = req.body;

  const { data: document, error } = await supabase
    .from('documents')
    .insert({
      tenant_id: req.user!.tenantId,
      case_id: caseId,
      borrower_id: borrowerId,
      file_name: req.file.originalname,
      file_path: req.file.path,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      document_type: documentType,
      uploaded_by: req.user!.id
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Failed to save document',
      error: error.message
    });
  }

  // Trigger AI parsing (mock)
  try {
    const aiResponse = await fetch(`http://localhost:3000/api/${req.params.tenant}/ai/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization!
      },
      body: JSON.stringify({
        documentId: document.id,
        documentType,
        fileUrl: req.file.path
      })
    });

    const aiResult = await aiResponse.json();
    console.log('AI parsing result:', aiResult);
  } catch (error) {
    console.error('AI parsing failed:', error);
  }

  res.json({
    success: true,
    data: document
  });
}));

export { router as documentRoutes };