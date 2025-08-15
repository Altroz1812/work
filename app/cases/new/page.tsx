'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, User, DollarSign, Calendar, ArrowLeft } from 'lucide-react';

interface Workflow {
  workflow_id: string;
  name: string;
  description: string;
}

interface Borrower {
  id: string;
  name: string;
  email: string;
  phone: string;
  pan: string;
}

export default function NewCasePage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    workflowId: '',
    borrowerId: '',
    productId: 'micro_loan',
    requestedAmount: '',
    tenor: '12',
    priority: 'medium',
    description: ''
  });
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const router = useRouter();

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

    fetchWorkflows(token, JSON.parse(tenantData));
    fetchBorrowers(token, JSON.parse(tenantData));
  }, [router]);

  const fetchWorkflows = async (token: string, tenantData: any) => {
    try {
      const response = await fetch(`/api/${tenantData.domain}/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setWorkflows(result.data || []);
        if (result.data?.length > 0) {
          setFormData(prev => ({ ...prev, workflowId: result.data[0].workflow_id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const fetchBorrowers = async (token: string, tenantData: any) => {
    try {
      // Mock borrowers data since we don't have a borrowers endpoint yet
      setBorrowers([
        { id: '1', name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91-9876543210', pan: 'ABCDE1234F' },
        { id: '2', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91-9876543211', pan: 'FGHIJ5678K' }
      ]);
    } catch (error) {
      console.error('Failed to fetch borrowers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${tenant.domain}/cases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: formData.workflowId,
          data: {
            description: formData.description,
            priority: formData.priority
          },
          loanData: {
            borrowerId: formData.borrowerId,
            productId: formData.productId,
            requestedAmount: parseFloat(formData.requestedAmount),
            tenor: parseInt(formData.tenor)
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/cases/${result.data.id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create case: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create case:', error);
      alert('Failed to create case. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push('/cases')}
              className="text-primary-600 hover:text-primary-700 mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FileText className="h-6 w-6 text-primary-600 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">Create New Case</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Workflow Selection */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Workflow Configuration</h3>
              <p className="text-sm text-gray-600">Select the workflow template for this case</p>
            </div>
            <div className="card-body">
              <div>
                <label htmlFor="workflow" className="form-label">Workflow Template</label>
                <select
                  id="workflow"
                  className="form-input"
                  value={formData.workflowId}
                  onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
                  required
                >
                  <option value="">Select a workflow</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.workflow_id} value={workflow.workflow_id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Borrower Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <User className="h-5 w-5 mr-2" />
                Borrower Information
              </h3>
            </div>
            <div className="card-body">
              <div>
                <label htmlFor="borrower" className="form-label">Select Borrower</label>
                <select
                  id="borrower"
                  className="form-input"
                  value={formData.borrowerId}
                  onChange={(e) => setFormData({ ...formData, borrowerId: e.target.value })}
                  required
                >
                  <option value="">Select a borrower</option>
                  {borrowers.map((borrower) => (
                    <option key={borrower.id} value={borrower.id}>
                      {borrower.name} - {borrower.pan}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Loan Details */}
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
                  <label htmlFor="productId" className="form-label">Product Type</label>
                  <select
                    id="productId"
                    className="form-input"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    required
                  >
                    <option value="micro_loan">Micro Loan</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="business_loan">Business Loan</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="requestedAmount" className="form-label">Requested Amount (₹)</label>
                  <input
                    type="number"
                    id="requestedAmount"
                    className="form-input"
                    placeholder="Enter amount"
                    value={formData.requestedAmount}
                    onChange={(e) => setFormData({ ...formData, requestedAmount: e.target.value })}
                    min="1000"
                    max="10000000"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="tenor" className="form-label">Tenor (Months)</label>
                  <select
                    id="tenor"
                    className="form-input"
                    value={formData.tenor}
                    onChange={(e) => setFormData({ ...formData, tenor: e.target.value })}
                    required
                  >
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="18">18 Months</option>
                    <option value="24">24 Months</option>
                    <option value="36">36 Months</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="form-label">Priority</label>
                  <select
                    id="priority"
                    className="form-input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Additional Information</h3>
            </div>
            <div className="card-body">
              <div>
                <label htmlFor="description" className="form-label">Description (Optional)</label>
                <textarea
                  id="description"
                  className="form-input"
                  rows={4}
                  placeholder="Add any additional notes or comments about this case..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/cases')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}