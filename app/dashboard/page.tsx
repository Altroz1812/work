'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { 
  Activity, AlertTriangle, CheckCircle, Clock, DollarSign, 
  FileText, TrendingUp, Users, Workflow, Brain
} from 'lucide-react';

interface DashboardStats {
  cases: {
    total: number;
    by_status: Record<string, number>;
    sla_breaches: number;
  };
  loans: {
    total_amount: number;
    count: number;
  };
  ai_models: {
    recent_runs: number;
    avg_confidence: number;
  };
}

const COLORS = ['#3B82F6', '#14B8A6', '#F97316', '#EF4444', '#8B5CF6'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

    fetchDashboardStats(token, JSON.parse(tenantData));
  }, [router]);

  const fetchDashboardStats = async (token: string, tenantData: any) => {
    try {
      const response = await fetch(`/api/${tenantData.domain}/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusData = stats ? Object.entries(stats.cases.by_status).map(([status, count]) => ({
    name: status.replace('_', ' ').toUpperCase(),
    value: count
  })) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Workflow className="h-8 w-8 text-primary-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                AI Workflow System
              </h1>
              {tenant && (
                <span className="ml-4 px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-sm">
                  {tenant.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{user.name}</span>
                  <span className="px-2 py-1 bg-secondary-100 text-secondary-800 rounded-md text-xs">
                    {user.role}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.cases.total || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Loan Amount</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{((stats?.loans.total_amount || 0) / 100000).toFixed(1)}L
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">SLA Breaches</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.cases.sla_breaches || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {((stats?.ai_models.avg_confidence || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Case Status Distribution */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Case Status Distribution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workflow Performance */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Workflow Performance</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Completed</span>
                  </div>
                  <span className="text-lg font-bold text-green-900">
                    {stats?.cases.by_status.completed || 0}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">In Progress</span>
                  </div>
                  <span className="text-lg font-bold text-blue-900">
                    {stats?.cases.by_status.in_progress || 0}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="text-sm font-medium text-orange-800">On Hold</span>
                  </div>
                  <span className="text-lg font-bold text-orange-900">
                    {stats?.cases.by_status.on_hold || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => router.push('/cases')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-6 w-6 text-primary-600 mb-2" />
                <h4 className="font-medium text-gray-900">Manage Cases</h4>
                <p className="text-sm text-gray-600">View and manage all cases</p>
              </button>

              <button 
                onClick={() => router.push('/workflows')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Workflow className="h-6 w-6 text-secondary-600 mb-2" />
                <h4 className="font-medium text-gray-900">Workflow Designer</h4>
                <p className="text-sm text-gray-600">Create and edit workflows</p>
              </button>

              <button 
                onClick={() => router.push('/analytics')}
                className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
                <h4 className="font-medium text-gray-900">AI Analytics</h4>
                <p className="text-sm text-gray-600">View AI model performance</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}