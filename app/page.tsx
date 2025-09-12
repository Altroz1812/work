'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Lock, Mail, User } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenant: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Login response status:', response.status);
      const result = await response.json();
      console.log('Login result:', result);

      if (result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('tenant', JSON.stringify(result.data.tenant));
        
        router.push('/dashboard');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-lg mb-4">
            <Building className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI Workflow System</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="tenant" className="form-label">
                  <Building className="inline h-4 w-4 mr-2" />
                  Tenant
                </label>
                <input
                  id="tenant"
                  type="text"
                  placeholder="Enter tenant domain"
                  className="form-input"
                  value={formData.tenant}
                  onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="form-label">
                  <Mail className="inline h-4 w-4 mr-2" />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  <Lock className="inline h-4 w-4 mr-2" />
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Tenant:</strong> demo</p>
                <p><strong>Admin:</strong> admin@demo.com / admin123</p>
                <p><strong>Maker:</strong> maker@demo.com / maker123</p>
                <p><strong>Checker:</strong> checker@demo.com / checker123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}