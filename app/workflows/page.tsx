'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Workflow, Plus, Search, Edit, Eye, Settings, 
  ArrowRight, Clock, Users, CheckCircle
} from 'lucide-react';

interface WorkflowConfig {
  workflow_id: string;
  name: string;
  description: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.workflow_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Workflow className="h-6 w-6 text-primary-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Workflows</h1>
            </div>
            
            {user?.role === 'Admin' && (
              <button
                onClick={() => router.push('/workflows/new')}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Workflow
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              className="form-input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div key={workflow.workflow_id} className="card hover:shadow-lg transition-shadow">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                  <div className="flex items-center space-x-1">
                    {workflow.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
              </div>
              
              <div className="card-body">
                <div className="space-y-4">
                  {/* Workflow Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-primary-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600">
                        {workflow.config?.stages?.length || 0}
                      </div>
                      <div className="text-xs text-primary-600 font-medium">Stages</div>
                    </div>
                    <div className="text-center p-3 bg-secondary-50 rounded-lg">
                      <div className="text-2xl font-bold text-secondary-600">
                        {workflow.config?.transitions?.length || 0}
                      </div>
                      <div className="text-xs text-secondary-600 font-medium">Transitions</div>
                    </div>
                  </div>

                  {/* Workflow Stages Preview */}
                  {workflow.config?.stages && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Stages</h4>
                      <div className="flex flex-wrap gap-1">
                        {workflow.config.stages.slice(0, 3).map((stage: any, index: number) => (
                          <span key={stage.id} className="inline-flex items-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {stage.label}
                            </span>
                            {index < Math.min(workflow.config.stages.length - 1, 2) && (
                              <ArrowRight className="h-3 w-3 text-gray-400 mx-1" />
                            )}
                          </span>
                        ))}
                        {workflow.config.stages.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{workflow.config.stages.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>ID: {workflow.workflow_id}</div>
                    <div>Created: {formatDate(workflow.created_at)}</div>
                    <div>Updated: {formatDate(workflow.updated_at)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => router.push(`/workflows/${workflow.workflow_id}`)}
                      className="flex-1 btn-outline text-sm py-2"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                    {user?.role === 'Admin' && (
                      <button
                        onClick={() => router.push(`/workflows/${workflow.workflow_id}/edit`)}
                        className="flex-1 btn-primary text-sm py-2"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredWorkflows.length === 0 && (
          <div className="text-center py-12">
            <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating your first workflow.'
              }
            </p>
            {!searchTerm && user?.role === 'Admin' && (
              <button
                onClick={() => router.push('/workflows/new')}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Workflow
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}