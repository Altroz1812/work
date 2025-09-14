'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Workflow, ArrowLeft, Plus, Trash2, Settings, 
  Clock, Users, ArrowRight, Save
} from 'lucide-react';

interface WorkflowStage {
  id: string;
  label: string;
  description: string;
  slaHours: number;
  assignToRoles: string[];
  requiredFields: string[];
}

interface WorkflowTransition {
  id: string;
  from: string;
  to: string;
  label: string;
  condition: string;
  roles: string[];
  actions: string[];
  requiresApproval: boolean;
}

interface AutoRule {
  id: string;
  stage: string;
  trigger: string;
  action: string;
  params: Record<string, any>;
  condition: string;
}

const availableRoles = ['Admin', 'Maker', 'Checker', 'Underwriter', 'DisbursementOfficer', 'Auditor'];
const triggerTypes = ['onEnter', 'onExit', 'onTimer'];

export default function NewWorkflowPage() {
  const [formData, setFormData] = useState({
    workflowId: '',
    name: '',
    description: ''
  });
  const [stages, setStages] = useState<WorkflowStage[]>([
    {
      id: 'draft',
      label: 'Draft',
      description: 'Initial stage for new cases',
      slaHours: 48,
      assignToRoles: ['Maker'],
      requiredFields: []
    }
  ]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [autoRules, setAutoRules] = useState<AutoRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const tenantData = localStorage.getItem('tenant');

    if (!token || !userData || !tenantData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    setTenant(JSON.parse(tenantData));

    // Only admins can create workflows
    if (parsedUser.role !== 'Admin') {
      router.push('/workflows');
      return;
    }
  }, [router]);

  const addStage = () => {
    const newStage: WorkflowStage = {
      id: `stage_${Date.now()}`,
      label: '',
      description: '',
      slaHours: 24,
      assignToRoles: [],
      requiredFields: []
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (index: number, field: keyof WorkflowStage, value: any) => {
    const updatedStages = [...stages];
    updatedStages[index] = { ...updatedStages[index], [field]: value };
    setStages(updatedStages);
  };

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      setStages(stages.filter((_, i) => i !== index));
    }
  };

  const addTransition = () => {
    const newTransition: WorkflowTransition = {
      id: `transition_${Date.now()}`,
      from: stages[0]?.id || '',
      to: stages[1]?.id || '',
      label: '',
      condition: 'true',
      roles: [],
      actions: [],
      requiresApproval: false
    };
    setTransitions([...transitions, newTransition]);
  };

  const updateTransition = (index: number, field: keyof WorkflowTransition, value: any) => {
    const updatedTransitions = [...transitions];
    updatedTransitions[index] = { ...updatedTransitions[index], [field]: value };
    setTransitions(updatedTransitions);
  };

  const removeTransition = (index: number) => {
    setTransitions(transitions.filter((_, i) => i !== index));
  };

  const addAutoRule = () => {
    const newRule: AutoRule = {
      id: `rule_${Date.now()}`,
      stage: stages[0]?.id || '',
      trigger: 'onEnter',
      action: '',
      params: {},
      condition: 'true'
    };
    setAutoRules([...autoRules, newRule]);
  };

  const updateAutoRule = (index: number, field: keyof AutoRule, value: any) => {
    const updatedRules = [...autoRules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setAutoRules(updatedRules);
  };

  const removeAutoRule = (index: number) => {
    setAutoRules(autoRules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const workflowConfig = {
        workflowId: formData.workflowId,
        version: 1,
        name: formData.name,
        description: formData.description,
        stages,
        transitions,
        autoRules
      };

      const response = await fetch(`/api/${tenant.domain}/workflows`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: formData.workflowId,
          name: formData.name,
          description: formData.description,
          config: workflowConfig
        }),
      });

      if (response.ok) {
        router.push('/workflows');
      } else {
        const error = await response.json();
        alert(`Failed to create workflow: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
      alert('Failed to create workflow. Please try again.');
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
              onClick={() => router.push('/workflows')}
              className="text-primary-600 hover:text-primary-700 mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Workflow className="h-6 w-6 text-primary-600 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">Create New Workflow</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                {['basic', 'stages', 'transitions', 'automation'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
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

            <div className="p-6">
              {/* Basic Information Tab */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="workflowId" className="form-label">Workflow ID</label>
                      <input
                        type="text"
                        id="workflowId"
                        className="form-input"
                        placeholder="e.g., micro_loan_v2"
                        value={formData.workflowId}
                        onChange={(e) => setFormData({ ...formData, workflowId: e.target.value })}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Unique identifier for this workflow</p>
                    </div>

                    <div>
                      <label htmlFor="name" className="form-label">Workflow Name</label>
                      <input
                        type="text"
                        id="name"
                        className="form-input"
                        placeholder="e.g., Micro Loan Processing"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="form-label">Description</label>
                    <textarea
                      id="description"
                      className="form-input"
                      rows={4}
                      placeholder="Describe the purpose and scope of this workflow..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Stages Tab */}
              {activeTab === 'stages' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Workflow Stages</h3>
                    <button
                      type="button"
                      onClick={addStage}
                      className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stage
                    </button>
                  </div>

                  <div className="space-y-4">
                    {stages.map((stage, index) => (
                      <div key={stage.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium text-gray-900">Stage {index + 1}</h4>
                          {stages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeStage(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Stage ID</label>
                            <input
                              type="text"
                              className="form-input"
                              value={stage.id}
                              onChange={(e) => updateStage(index, 'id', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label className="form-label">Label</label>
                            <input
                              type="text"
                              className="form-input"
                              value={stage.label}
                              onChange={(e) => updateStage(index, 'label', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label className="form-label">SLA Hours</label>
                            <input
                              type="number"
                              className="form-input"
                              value={stage.slaHours}
                              onChange={(e) => updateStage(index, 'slaHours', parseInt(e.target.value))}
                              min="1"
                              required
                            />
                          </div>

                          <div>
                            <label className="form-label">Assigned Roles</label>
                            <select
                              multiple
                              className="form-input"
                              value={stage.assignToRoles}
                              onChange={(e) => updateStage(index, 'assignToRoles', Array.from(e.target.selectedOptions, option => option.value))}
                            >
                              {availableRoles.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-input"
                              rows={2}
                              value={stage.description}
                              onChange={(e) => updateStage(index, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transitions Tab */}
              {activeTab === 'transitions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Stage Transitions</h3>
                    <button
                      type="button"
                      onClick={addTransition}
                      className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transition
                    </button>
                  </div>

                  <div className="space-y-4">
                    {transitions.map((transition, index) => (
                      <div key={transition.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium text-gray-900">Transition {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeTransition(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">From Stage</label>
                            <select
                              className="form-input"
                              value={transition.from}
                              onChange={(e) => updateTransition(index, 'from', e.target.value)}
                              required
                            >
                              <option value="">Select stage</option>
                              {stages.map((stage) => (
                                <option key={stage.id} value={stage.id}>{stage.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">To Stage</label>
                            <select
                              className="form-input"
                              value={transition.to}
                              onChange={(e) => updateTransition(index, 'to', e.target.value)}
                              required
                            >
                              <option value="">Select stage</option>
                              {stages.map((stage) => (
                                <option key={stage.id} value={stage.id}>{stage.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Transition Label</label>
                            <input
                              type="text"
                              className="form-input"
                              value={transition.label}
                              onChange={(e) => updateTransition(index, 'label', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label className="form-label">Condition</label>
                            <input
                              type="text"
                              className="form-input"
                              value={transition.condition}
                              onChange={(e) => updateTransition(index, 'condition', e.target.value)}
                              placeholder="e.g., status == 'approved'"
                            />
                          </div>

                          <div>
                            <label className="form-label">Allowed Roles</label>
                            <select
                              multiple
                              className="form-input"
                              value={transition.roles}
                              onChange={(e) => updateTransition(index, 'roles', Array.from(e.target.selectedOptions, option => option.value))}
                            >
                              {availableRoles.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Actions</label>
                            <input
                              type="text"
                              className="form-input"
                              value={transition.actions.join(', ')}
                              onChange={(e) => updateTransition(index, 'actions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="e.g., validate_data, send_notification"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {transitions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <ArrowRight className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No transitions defined yet. Add transitions to connect your stages.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Automation Tab */}
              {activeTab === 'automation' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Automation Rules</h3>
                    <button
                      type="button"
                      onClick={addAutoRule}
                      className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
                    </button>
                  </div>

                  <div className="space-y-4">
                    {autoRules.map((rule, index) => (
                      <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium text-gray-900">Rule {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => removeAutoRule(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Stage</label>
                            <select
                              className="form-input"
                              value={rule.stage}
                              onChange={(e) => updateAutoRule(index, 'stage', e.target.value)}
                              required
                            >
                              <option value="">Select stage</option>
                              {stages.map((stage) => (
                                <option key={stage.id} value={stage.id}>{stage.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Trigger</label>
                            <select
                              className="form-input"
                              value={rule.trigger}
                              onChange={(e) => updateAutoRule(index, 'trigger', e.target.value)}
                              required
                            >
                              {triggerTypes.map((trigger) => (
                                <option key={trigger} value={trigger}>{trigger}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="form-label">Action</label>
                            <input
                              type="text"
                              className="form-input"
                              value={rule.action}
                              onChange={(e) => updateAutoRule(index, 'action', e.target.value)}
                              placeholder="e.g., call:ai/score"
                              required
                            />
                          </div>

                          <div>
                            <label className="form-label">Condition</label>
                            <input
                              type="text"
                              className="form-input"
                              value={rule.condition}
                              onChange={(e) => updateAutoRule(index, 'condition', e.target.value)}
                              placeholder="e.g., documents_complete == true"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="form-label">Parameters (JSON)</label>
                            <textarea
                              className="form-input"
                              rows={3}
                              value={JSON.stringify(rule.params, null, 2)}
                              onChange={(e) => {
                                try {
                                  const params = JSON.parse(e.target.value);
                                  updateAutoRule(index, 'params', params);
                                } catch {
                                  // Invalid JSON, ignore
                                }
                              }}
                              placeholder='{"model": "credit_scoring_v1"}'
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {autoRules.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No automation rules defined yet. Add rules to automate workflow actions.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/workflows')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Creating...' : 'Create Workflow'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}