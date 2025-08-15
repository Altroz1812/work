export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'Admin' | 'Maker' | 'Checker' | 'Underwriter' | 'DisbursementOfficer' | 'Auditor';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowConfig {
  workflowId: string;
  version: number;
  tenantId: string;
  name: string;
  description?: string;
  stages: WorkflowStage[];
  transitions: WorkflowTransition[];
  autoRules: AutoRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStage {
  id: string;
  label: string;
  description?: string;
  slaHours: number;
  assignToRoles?: UserRole[];
  requiredFields?: string[];
  validationRules?: ValidationRule[];
}

export interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  label: string;
  condition: string;
  roles: UserRole[];
  actions: string[];
  requiresApproval?: boolean;
}

export interface AutoRule {
  id: string;
  stage: string;
  trigger: 'onEnter' | 'onExit' | 'onTimer';
  action: string;
  params: Record<string, any>;
  condition?: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'min' | 'max' | 'pattern';
  value: any;
  message: string;
}

export interface Case {
  id: string;
  tenantId: string;
  workflowId: string;
  currentStage: string;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo?: string;
  createdBy: string;
  data: Record<string, any>;
  metadata: CaseMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanCase extends Case {
  loanId: string;
  borrowerId: string;
  productId: string;
  requestedAmount: number;
  tenor: number;
  decision?: LoanDecision;
  pdScore?: number;
  interestRate?: number;
  approvedAmount?: number;
}

export interface Borrower {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  pan: string;
  aadhar?: string;
  kycStatus: KYCStatus;
  address: Address;
  financialInfo?: FinancialInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface FinancialInfo {
  monthlyIncome: number;
  employmentType: string;
  creditScore?: number;
  existingLoans?: number;
}

export type CaseStatus = 'draft' | 'in_progress' | 'completed' | 'rejected' | 'on_hold';
export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';
export type LoanDecision = 'approved' | 'rejected' | 'pending' | 'more_info_required';
export type KYCStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface CaseMetadata {
  slaDeadline?: Date;
  escalationLevel: number;
  tags: string[];
  source: string;
}

export interface CaseHistory {
  id: string;
  caseId: string;
  action: string;
  fromStage?: string;
  toStage?: string;
  performedBy: string;
  comment?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export interface ModelRun {
  id: string;
  tenantId: string;
  modelName: string;
  modelVersion: string;
  input: Record<string, any>;
  output: Record<string, any>;
  confidence: number;
  explainability?: Record<string, any>;
  caseId?: string;
  createdAt: Date;
}

export interface AutonomyAction {
  id: string;
  tenantId: string;
  workflowInstanceId: string;
  actionType: string;
  initiatedBy: string;
  modelId?: string;
  confidence: number;
  payload: Record<string, any>;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  entity: string;
  entityId: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  action: string;
  performedBy: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}