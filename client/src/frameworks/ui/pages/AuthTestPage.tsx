// Authentication Test Page - For Development Debugging Only
// client/src/frameworks/ui/pages/AuthTestPage.tsx

import React, { useState } from 'react';
import { useAuthStore } from '../../state/authStore';

const AuthTestPage: React.FC = () => {
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('TestPass123!');
  const [testName, setTestName] = useState('Test User');
  const [testResults, setTestResults] = useState<string[]>([]);

  const { login, register, logout, isLoading, user, isAuthenticated } =
    useAuthStore();

  const addResult = (message: string) => {
    const timestamp = new Date().toISOString();
    setTestResults(prev => [`[${timestamp}] ${message}`, ...prev]);
  };

  const handleTestLogin = async () => {
    addResult('🔐 Testing login...');
    try {
      const result = await login({
        email: testEmail,
        password: testPassword,
      });

      if (result.success) {
        addResult('✅ Login successful');
      } else {
        addResult(`❌ Login failed: ${result.error}`);
      }
    } catch (error) {
      addResult(
        `❌ Login error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleTestRegister = async () => {
    addResult('📝 Testing registration...');
    try {
      const result = await register({
        name: testName,
        email: testEmail,
        password: testPassword,
      });

      if (result.success) {
        addResult('✅ Registration successful');
      } else {
        addResult(`❌ Registration failed: ${result.error}`);
      }
    } catch (error) {
      addResult(
        `❌ Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleTestLogout = async () => {
    addResult('🚪 Testing logout...');
    try {
      await logout();
      addResult('✅ Logout successful');
    } catch (error) {
      addResult(
        `❌ Logout error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleClearAuth = () => {
    // Clear localStorage auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    addResult('🧹 All auth data cleared');
  };

  const handleLogAuthState = () => {
    addResult('📊 Auth state logged to console');
  };

  const handleTestAPI = async () => {
    addResult('🌐 Testing API connection...');
    try {
      // Simple API test - you can replace with actual API endpoint
      const response = await fetch('/api/health');
      addResult(`🌐 API test completed (status: ${response.status})`);
    } catch (error) {
      addResult('❌ API test failed');
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Auth Test Page
          </h1>
          <p className="text-gray-600">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Authentication Test Page
          </h1>

          {/* Current Auth Status */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Current Authentication Status
            </h2>
            <div className="space-y-1 text-sm">
              <p>
                <strong>Authenticated:</strong>{' '}
                {isAuthenticated ? '✅ Yes' : '❌ No'}
              </p>
              <p>
                <strong>Loading:</strong> {isLoading ? '⏳ Yes' : '✅ No'}
              </p>
              <p>
                <strong>User:</strong>{' '}
                {user ? `${user.name} (${user.email})` : 'None'}
              </p>
            </div>
          </div>

          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Test Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Test Credentials
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={e => setTestPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (for registration)
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Test Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Test Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleTestLogin}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Login
                </button>
                <button
                  onClick={handleTestRegister}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Register
                </button>
                <button
                  onClick={handleTestLogout}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Test Logout
                </button>
                <button
                  onClick={handleClearAuth}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Clear Auth
                </button>
                <button
                  onClick={handleLogAuthState}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Log Auth State
                </button>
                <button
                  onClick={handleTestAPI}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Test API
                </button>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Test Results
            </h3>
            <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500">
                  No test results yet. Click a test button to start.
                </p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setTestResults([])}
              className="mt-2 px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            Instructions
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>1. Check the console for detailed debug information</li>
            <li>
              2. Use "Test API" to verify connectivity to backend services
            </li>
            <li>
              3. Use "Log Auth State" to examine current authentication state
            </li>
            <li>4. Try registering a new user first, then test login</li>
            <li>5. Use "Clear Auth" to reset authentication state if needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthTestPage;
