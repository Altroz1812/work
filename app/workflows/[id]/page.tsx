'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Workflow, ArrowLeft, Edit, Settings, Clock, 
  ArrowRight, CheckCircle, Users, AlertTriangle
} from 'lucide-react';

interface WorkflowDetails {
  workflow_id: string;
  name: string;
  description: string;
  config: {
    stages: Array<{
      id: string;
      label: string;
      slaHours: number;
      description?: string;
      assignToRoles?: string[];
      requiredFields?: string[];
    }>;
    transitions: Array<{
      id: string;
      from: string;
      to: string;
      label: string;
      condition: string;
      roles: string[];
      actions: string[];
      requiresApproval?: boolean;
    }>;
    autoRules: Array<{
      id: string;
      stage: string;
      trigger: string;
      action: string;
      params: any;
      condition?: string;
    }>;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function WorkflowDetailsPage() {
  const [workflow, setWorkflow] = useState<WorkflowDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
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

    fetchWorkflowDetails(token, JSON.parse(tenantData), params.id as string);
  }, [router, params.id]);

  const fetchWorkflowDetails = async (token: string, tenantData: any, workflowId: string) => {
    try {
      const response = await fetch(`/api/${tenantData.domain}/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setWorkflow(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch workflow details:', error);
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Workflow not found</h3>
          <button
            onClick={() => router.push('/workflows')}
            className="btn-primary"
          >
            Back to Workflows
          </button>
        </div>
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
                onClick={() => router.push('/workflows')}
                className="text-primary-600 hover:text-primary-700 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Workflow className="h-6 w-6 text-primary-600 mr-2" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{workflow.name}</h1>
                <p className="text-sm text-gray-600">{workflow.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {workflow.is_active ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                )}
                <span className="text-sm font-medium">
                  {workflow.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {user?.role === 'Admin' && (
                <button
                  onClick={() => router.push(`/workflows/${workflow.workflow_id}/edit`)}
                  className="btn-primary"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {['overview', 'stages', 'transitions', 'automation'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats */}
            <div className="lg:col-span-1">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Workflow Stats</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Stages</span>
                      <span className="font-semibold">{workflow.config.stages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transitions</span>
                      <span className="font-semibold">{workflow.config.transitions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Auto Rules</span>
                      <span className="font-semibold">{workflow.config.autoRules?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Created</span>
                      <span className="text-sm">{formatDate(workflow.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Updated</span>
                      <span className="text-sm">{formatDate(workflow.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Visualization */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">Workflow Flow</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    {workflow.config.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center">
                        <div className="flex-1">
                          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-primary-900">{stage.label}</h4>
                              <div className="flex items-center text-sm text-primary-600">
                                <Clock className="h-4 w-4 mr-1" />
                                {stage.slaHours}h SLA
                              </div>
                            </div>
                            {stage.description && (
                              <p className="text-sm text-primary-700 mt-1">{stage.description}</p>
                            )}
                            {stage.assignToRoles && stage.assignToRoles.length > 0 && (
                              <div className="flex items-center mt-2">
                                <Users className="h-4 w-4 text-primary-600 mr-1" />
                                <span className="text-xs text-primary-600">
                                  {stage.assignToRoles.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {index < workflow.config.stages.length - 1 && (
                          <div className="flex-shrink-0 mx-4">
                            <ArrowRight className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stages' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Workflow Stages</h3>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-head">Stage ID</th>
                      <th className="table-head">Label</th>
                      <th className="table-head">SLA (Hours)</th>
                      <th className="table-head">Assigned Roles</th>
                      <th className="table-head">Required Fields</th>
                      <th className="table-head">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflow.config.stages.map((stage) => (
                      <tr key={stage.id} className="table-row">
                        <td className="table-cell">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {stage.id}
                          </code>
                        </td>
                        <td className="table-cell font-medium">{stage.label}</td>
                        <td className="table-cell">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-1" />
                            {stage.slaHours}
                          </div>
                        </td>
                        <td className="table-cell">
                          {stage.assignToRoles && stage.assignToRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {stage.assignToRoles.map((role) => (
                                <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {role}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="table-cell">
                          {stage.requiredFields && stage.requiredFields.length > 0 ? (
                            <div className="text-sm text-gray-600">
                              {stage.requiredFields.join(', ')}
                            </div>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-gray-600">
                            {stage.description || 'No description'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transitions' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Workflow Transitions</h3>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-head">From</th>
                      <th className="table-head">To</th>
                      <th className="table-head">Label</th>
                      <th className="table-head">Condition</th>
                      <th className="table-head">Roles</th>
                      <th className="table-head">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflow.config.transitions.map((transition) => (
                      <tr key={transition.id} className="table-row">
                        <td className="table-cell">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {transition.from}
                          </code>
                        </td>
                        <td className="table-cell">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {transition.to}
                          </code>
                        </td>
                        <td className="table-cell font-medium">{transition.label}</td>
                        <td className="table-cell">
                          <code className="text-xs bg-yellow-100 px-2 py-1 rounded">
                            {transition.condition}
                          </code>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1">
                            {transition.roles.map((role) => (
                              <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap gap-1">
                            {transition.actions.map((action) => (
                              <span key={action} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {action}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Automation Rules</h3>
            </div>
            <div className="card-body">
              {workflow.config.autoRules && workflow.config.autoRules.length > 0 ? (
                <div className="space-y-4">
                  {workflow.config.autoRules.map((rule) => (
                    <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{rule.id}</h4>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                          {rule.trigger}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Stage:</span>
                          <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{rule.stage}</code>
                        </div>
                        <div>
                          <span className="text-gray-600">Action:</span>
                          <code className="ml-2 bg-green-100 px-2 py-1 rounded">{rule.action}</code>
                        </div>
                        <div>
                          <span className="text-gray-600">Condition:</span>
                          <code className="ml-2 bg-yellow-100 px-2 py-1 rounded">
                            {rule.condition || 'Always'}
                          </code>
                        </div>
                      </div>
                      {rule.params && Object.keys(rule.params).length > 0 && (
                        <div className="mt-3">
                          <span className="text-gray-600 text-sm">Parameters:</span>
                          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(rule.params, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No automation rules</h3>
                  <p className="text-gray-600">This workflow doesn't have any automation rules configured.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}