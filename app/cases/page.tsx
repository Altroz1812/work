'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Plus, Search, Filter, Eye, Edit, Clock, 
  CheckCircle, AlertTriangle, User, Calendar, DollarSign
} from 'lucide-react';

interface Case {
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
  assigned_user?: { name: string };
  created_user?: { name: string };
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  on_hold: 'bg-yellow-100 text-yellow-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

    fetchCases(token, JSON.parse(tenantData));
  }, [router]);

  const fetchCases = async (token: string, tenantData: any) => {
    try {
      const response = await fetch(`/api/${tenantData.domain}/cases`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCases(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCases = cases.filter(case_item => {
    const matchesSearch = case_item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_item.borrowers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || case_item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary-600 hover:text-primary-700 mr-4"
              >
                ← Back to Dashboard
              </button>
              <FileText className="h-6 w-6 text-primary-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Cases</h1>
            </div>
            
            <button
              onClick={() => router.push('/cases/new')}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cases..."
                  className="form-input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-head">Case ID</th>
                  <th className="table-head">Borrower</th>
                  <th className="table-head">Amount</th>
                  <th className="table-head">Stage</th>
                  <th className="table-head">Status</th>
                  <th className="table-head">Priority</th>
                  <th className="table-head">Assigned To</th>
                  <th className="table-head">Created</th>
                  <th className="table-head">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((case_item) => (
                  <tr key={case_item.id} className="table-row">
                    <td className="table-cell">
                      <div className="font-mono text-sm">
                        {case_item.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span>{case_item.borrowers?.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        <span className="font-medium">
                          {case_item.loan_cases?.[0]?.requested_amount 
                            ? formatCurrency(case_item.loan_cases[0].requested_amount)
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                        {case_item.current_stage.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-md text-sm ${statusColors[case_item.status as keyof typeof statusColors]}`}>
                        {case_item.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-md text-sm ${priorityColors[case_item.priority as keyof typeof priorityColors]}`}>
                        {case_item.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-600">
                        {case_item.assigned_user?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(case_item.created_at)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/cases/${case_item.id}`)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/cases/${case_item.id}/edit`)}
                          className="p-1 text-gray-400 hover:text-secondary-600 transition-colors"
                          title="Edit Case"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCases.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No cases found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first case.'
                }
              </p>
              {!searchTerm && !statusFilter && (
                <button
                  onClick={() => router.push('/cases/new')}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Case
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}