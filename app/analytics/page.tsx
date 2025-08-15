'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, ScatterChart, Scatter
} from 'recharts';
import { 
  Brain, TrendingUp, Activity, AlertTriangle, 
  Target, Zap, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';

interface AIStats {
  model_stats: Record<string, {
    total_runs: number;
    avg_confidence: number;
    confidences: number[];
  }>;
  recent_runs: Array<{
    id: string;
    model_name: string;
    model_version: string;
    confidence: number;
    created_at: string;
  }>;
}

const COLORS = ['#3B82F6', '#14B8A6', '#F97316', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
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

    fetchAIStats(token, JSON.parse(tenantData));
  }, [router, timeRange]);

  const fetchAIStats = async (token: string, tenantData: any) => {
    try {
      const response = await fetch(`/api/${tenantData.domain}/dashboard/ai`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setAiStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch AI stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prepare chart data
  const modelPerformanceData = aiStats ? Object.entries(aiStats.model_stats).map(([name, stats]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    runs: stats.total_runs,
    confidence: (stats.avg_confidence * 100).toFixed(1),
    avgConfidence: stats.avg_confidence
  })) : [];

  const confidenceDistributionData = aiStats ? Object.entries(aiStats.model_stats).map(([name, stats]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value: stats.total_runs
  })) : [];

  const recentRunsData = aiStats ? aiStats.recent_runs.slice(0, 10).map((run, index) => ({
    x: index + 1,
    y: run.confidence * 100,
    model: run.model_name,
    time: formatDate(run.created_at)
  })) : [];

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
              <Brain className="h-6 w-6 text-primary-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">AI Analytics</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="form-input"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
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
                  <p className="text-sm font-medium text-gray-600">Total Model Runs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {aiStats ? Object.values(aiStats.model_stats).reduce((sum, stats) => sum + stats.total_runs, 0) : 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {aiStats ? (
                      Object.values(aiStats.model_stats).reduce((sum, stats) => sum + stats.avg_confidence, 0) / 
                      Object.keys(aiStats.model_stats).length * 100
                    ).toFixed(1) : 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Models</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {aiStats ? Object.keys(aiStats.model_stats).length : 0}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Confidence</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {aiStats ? aiStats.recent_runs.filter(run => run.confidence > 0.8).length : 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Model Performance */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Model Performance
              </h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={modelPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="runs" fill="#3B82F6" name="Total Runs" />
                  <Bar yAxisId="right" dataKey="confidence" fill="#14B8A6" name="Avg Confidence %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Usage Distribution */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Model Usage Distribution
              </h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={confidenceDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {confidenceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Model Runs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Confidence Scatter Plot */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Recent Run Confidence</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={recentRunsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" name="Run #" />
                  <YAxis dataKey="y" name="Confidence %" domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded shadow">
                            <p className="font-medium">{data.model}</p>
                            <p className="text-sm text-gray-600">Confidence: {data.y.toFixed(1)}%</p>
                            <p className="text-sm text-gray-600">Time: {data.time}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter dataKey="y" fill="#3B82F6" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Runs Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Recent Model Runs</h3>
            </div>
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-head">Model</th>
                      <th className="table-head">Confidence</th>
                      <th className="table-head">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiStats?.recent_runs.slice(0, 8).map((run) => (
                      <tr key={run.id} className="table-row">
                        <td className="table-cell">
                          <span className="font-medium">
                            {run.model_name.replace('_', ' ').toUpperCase()}
                          </span>
                          <div className="text-xs text-gray-500">v{run.model_version}</div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-primary-600 h-2 rounded-full" 
                                style={{ width: `${run.confidence * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {(run.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="table-cell text-sm text-gray-600">
                          {formatDate(run.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Model Health Indicators */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Model Health Indicators</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {aiStats && Object.entries(aiStats.model_stats).map(([modelName, stats]) => (
                  <div key={modelName} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      {modelName.replace('_', ' ').toUpperCase()}
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Runs</span>
                        <span className="font-semibold">{stats.total_runs}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Confidence</span>
                        <span className="font-semibold">{(stats.avg_confidence * 100).toFixed(1)}%</span>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Health Score</span>
                          <span className={`font-semibold ${
                            stats.avg_confidence > 0.8 ? 'text-green-600' : 
                            stats.avg_confidence > 0.6 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {stats.avg_confidence > 0.8 ? 'Excellent' : 
                             stats.avg_confidence > 0.6 ? 'Good' : 'Needs Attention'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              stats.avg_confidence > 0.8 ? 'bg-green-500' : 
                              stats.avg_confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${stats.avg_confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}