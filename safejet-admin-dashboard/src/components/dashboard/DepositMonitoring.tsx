import { useState } from 'react';

export default function DepositMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleMonitoring = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = isMonitoring ? 'stop-monitoring' : 'start-monitoring';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/deposit/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle monitoring');
      }

      const data = await response.json();
      setStatus(data.message);
      setIsMonitoring(!isMonitoring);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setStatus('Error: ' + error.message);
      } else {
        setStatus('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 mb-4 md:mb-0">
            <h2 className="text-lg font-medium text-gray-900">Monitoring Status</h2>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                isMonitoring ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <p className="text-sm font-medium text-gray-600">
                Status: <span className={isMonitoring ? "text-green-600" : "text-red-600"}>
                  {isMonitoring ? "Running" : "Stopped"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleMonitoring}
            disabled={loading}
            className={`
              px-6 py-2 rounded-md text-white font-medium
              transition-colors duration-150 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${loading ? 'cursor-not-allowed opacity-60' : ''}
              ${isMonitoring 
                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500' 
                : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
              }
            `}
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              isMonitoring ? "Stop Monitoring" : "Start Monitoring"
            )}
          </button>
        </div>

        {/* Status Messages */}
        {status && (
          <div className={`mt-4 p-4 rounded-md ${
            status.toLowerCase().includes('error')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {status.toLowerCase().includes('error') ? (
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{status}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monitoring Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monitoring Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Last Started</p>
            <p className="text-sm text-gray-900">
              {isMonitoring ? 'Active since: ' + new Date().toLocaleString() : 'Not currently active'}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">Monitoring Type</p>
            <p className="text-sm text-gray-900">Automatic Deposit Detection</p>
          </div>
        </div>
      </div>
    </div>
  );
} 