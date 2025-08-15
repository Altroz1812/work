'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  FileText, User, DollarSign, Calendar, Clock, CheckCircle, 
  AlertTriangle, ArrowLeft, Upload, MessageSquare, Activity,
  Brain, TrendingUp, Eye
} from 'lucide-react';

interface CaseDetails {
  id: string;
  workflow_id: string;
  current_stage: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_by: string;
  data: any;
  metadata: any;
  created_at: string;
  updated_at: string;
  loan_cases?: any[];
  borrowers?: any;
  case_history?: any[];
  documents?: any[];
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-yellow-100 text-yellow-800'
};

export default function CaseDetailsPage() {
  const [caseDetails, setCaseDetails] = useState<CaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tenantData = localStorage.getItem('tenant');

    if (!token || !userData || !tenantData) {
      router.push('/');
      return;
    }

    setUser(JSON.parse(userData));
    setTenant(JSON.parse(tenantData));

    fetchCaseDetails(token, JSON.parse(tenantData), params.id as string);
  }, [router, params.id]);

  const fetchCaseDetails = async (token: string, tenantData: any, caseId: string) => {
    try {
      const response = await fetch(`/api/${tenantData.domain}/cases/${caseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCaseDetails(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch case details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!caseDetails || !tenant) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${tenant.domain}/cases/${caseDetails.id}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment: comment || undefined
        }),
      });

      if (response.ok) {
        // Refresh case details
        fetchCaseDetails(token!, tenant, caseDetails.id);
        setComment('');
      } else {
        const error = await response.json();
        alert(`Action failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableActions = () => {
    if (!caseDetails) return [];

    const stage = caseDetails.current_stage;
    const status = caseDetails.status;

    if (status === 'completed' || status === 'rejected') return [];

    switch (stage) {
      case 'draft':
        return ['submit'];
      case 'doc_verify':
        return ['approve', 'reject', 'request_more_info'];
      case 'underwriting':
        return ['approve', 'reject', 'request_more_info'];
      case 'approval':
        return ['final_approve', 'reject'];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!caseDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Case not found</h3>
          <button
            onClick={() => router.push('/cases')}
            className="btn-primary"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  const availableActions = getAvailableActions();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/cases')}
                className="text-primary-600 hover:text-primary-700 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <FileText className="h-6 w-6 text-primary-600 mr-2" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Case {caseDetails.id.slice(0, 8)}...
                </h1>
                <p className="text-sm text-gray-600">
                  {caseDetails.borrowers?.name || 'Unknown Borrower'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[caseDetails.status as keyof typeof statusColors]}`}>
                {caseDetails.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Overview */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Case Overview</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Stage</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {caseDetails.current_stage.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priority</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">
                      {caseDetails.priority}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(caseDetails.created_at)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(caseDetails.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Details */}
            {caseDetails.loan_cases && caseDetails.loan_cases.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Loan Details
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Requested Amount</label>
                      <p className="mt-1 text-2xl font-bold text-green-600">
                        {formatCurrency(caseDetails.loan_cases[0].requested_amount)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tenor</label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {caseDetails.loan_cases[0].tenor} months
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Product</label>
                      <p className="mt-1 text-lg font-semibold text-gray-900 capitalize">
                        {caseDetails.loan_cases[0].product_id.replace('_', ' ')}
                      </p>
                    </div>
                    {caseDetails.loan_cases[0].pd_score && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Risk Score</label>
                        <p className="mt-1 text-lg font-semibold text-orange-600">
                          {(caseDetails.loan_cases[0].pd_score * 100).toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Borrower Information */}
            {caseDetails.borrowers && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Borrower Information
                  </h3>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <p className="mt-1 text-lg font-semibold text-gray-900">
                        {caseDetails.borrowers.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {caseDetails.borrowers.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {caseDetails.borrowers.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">PAN</label>
                      <p className="mt-1 text-sm font-mono text-gray-900">
                        {caseDetails.borrowers.pan || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Case History */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Case History
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {caseDetails.case_history && caseDetails.case_history.length > 0 ? (
                    caseDetails.case_history.map((history, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <Activity className="h-4 w-4 text-primary-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {history.action.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(history.timestamp)}
                            </p>
                          </div>
                          {history.comment && (
                            <p className="text-sm text-gray-600 mt-1">{history.comment}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            by {history.users?.name || 'System'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No history available</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {availableActions.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Actions</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="comment" className="form-label">Comment (Optional)</label>
                      <textarea
                        id="comment"
                        className="form-input"
                        rows={3}
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      {availableActions.map((action) => (
                        <button
                          key={action}
                          onClick={() => handleAction(action)}
                          disabled={actionLoading}
                          className={`w-full btn ${
                            action === 'approve' || action === 'final_approve' 
                              ? 'btn-primary' 
                              : action === 'reject' 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'btn-outline'
                          }`}
                        >
                          {actionLoading ? 'Processing...' : action.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Quick Stats</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Days in Current Stage</span>
                    <span className="font-semibold">
                      {Math.floor((new Date().getTime() - new Date(caseDetails.updated_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Days</span>
                    <span className="font-semibold">
                      {Math.floor((new Date().getTime() - new Date(caseDetails.created_at).getTime()) / (1000 * 60 * 60 * 24))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">History Entries</span>
                    <span className="font-semibold">
                      {caseDetails.case_history?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold">Documents</h3>
              </div>
              <div className="card-body">
                {caseDetails.documents && caseDetails.documents.length > 0 ? (
                  <div className="space-y-2">
                    {caseDetails.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-900">{doc.file_name}</span>
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}