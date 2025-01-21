import { useState, useEffect } from 'react';

interface BlockInfo {
  currentBlocks: {
    [key: string]: number;
  };
  savedBlocks: {
    [key: string]: string;
  };
}

export default function DepositMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [editingBlock, setEditingBlock] = useState<{
    chain: string;
    network: string;
    value: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chainStatus, setChainStatus] = useState<Record<string, Record<string, boolean>>>({});
  const [chainLoading, setChainLoading] = useState<{[key: string]: boolean}>({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  const handleToggleMonitoring = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = isMonitoring ? 'stop-monitoring' : 'start-monitoring';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/deposits/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle monitoring');
      }

      const data = await response.json();
      setStatus(data.message);
      setIsMonitoring(!isMonitoring);

      // Add these lines to refresh chain statuses
      await checkChainStatus(); // Refresh individual chain statuses
      await fetchBlockInfo(); // Refresh block info
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

  useEffect(() => {
    // Initial load
    fetchBlockInfo();
    checkMonitoringStatus();
    checkChainStatus();

    // Only set up interval if autoRefresh is true
    let refreshInterval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        // Only refresh monitoring status and chain status
        checkMonitoringStatus();
        checkChainStatus();
      }, 10000); // Every 10 seconds
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]); // Depend on autoRefresh

  const fetchBlockInfo = async () => {
    setIsLoadingBlocks(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = `${process.env.NEXT_PUBLIC_API_URL}/admin/deposits/chain-blocks`;
      console.log('Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
      });

      // Log the raw response for debugging
      const text = await response.text();
      console.log('Raw response:', text);

      try {
        // Try to parse the text as JSON
        const data = JSON.parse(text);
        setBlockInfo(data);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', {
          text,
          error: parseError
        });
        throw new TypeError('Response was not valid JSON');
      }
    } catch (error: unknown) {
      console.error('Error fetching block info:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setUpdateStatus('Failed to fetch block information');
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const checkMonitoringStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/deposits/monitoring-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get monitoring status');
      }

      const data = await response.json();
      setIsMonitoring(data.isMonitoring);
    } catch (error) {
      console.error('Error checking monitoring status:', error);
      // Optionally show error in UI
      setStatus('Error checking monitoring status');
    }
  };

  const checkChainStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/deposits/chain-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get chain status');
      }

      const data = await response.json();
      setChainStatus(data.status);
    } catch (error) {
      console.error('Error checking chain status:', error);
    }
  };

  const handleUpdateStartBlock = async () => {
    if (!editingBlock) return;
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/deposits/set-start-block`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          chain: editingBlock.chain,
          network: editingBlock.network,
          startBlock: parseInt(editingBlock.value),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update start block');
      }

      const data = await response.json();
      setUpdateStatus(data.message);
      await fetchBlockInfo(); // Wait for block info to update
      setEditingBlock(null);
    } catch (error: unknown) {
      setUpdateStatus(error instanceof Error ? error.message : 'Failed to update start block');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChainMonitoring = async (chain: string, network: string) => {
    const key = `${chain}_${network}`;
    setChainLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      const token = localStorage.getItem('adminToken');
      const isMonitoring = chainStatus[chain]?.[network];
      const endpoint = isMonitoring ? 'stop-chain-monitoring' : 'start-chain-monitoring';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/deposits/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ chain, network }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle chain monitoring');
      }

      const data = await response.json();
      setStatus(data.message);
      await checkChainStatus(); // Refresh chain status
      await checkMonitoringStatus(); // Refresh overall status
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to toggle chain monitoring');
    } finally {
      setChainLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Add a manual refresh function
  const handleManualRefresh = async () => {
    setIsLoadingBlocks(true);
    try {
      await Promise.all([
        fetchBlockInfo(),
        checkMonitoringStatus(),
        checkChainStatus()
      ]);
    } finally {
      setIsLoadingBlocks(false);
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

      {/* Block Configuration Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Block Configuration</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-600">
                Auto Refresh Status
              </label>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isLoadingBlocks}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoadingBlocks ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </span>
              ) : (
                'Refresh'
              )}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoadingBlocks ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600">Loading block information...</span>
            </div>
          ) : blockInfo ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Block</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Block</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monitoring</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blockInfo && blockInfo.currentBlocks && Object.entries(blockInfo.currentBlocks)
                  .filter(([_, currentBlock]) => currentBlock !== null && currentBlock !== undefined)
                  .map(([key, currentBlock]) => {
                    const [chain, network] = key.split('_');
                    const isEditing = editingBlock?.chain === chain && editingBlock?.network === network;
                    const savedBlock = blockInfo.savedBlocks?.[key];
                    const isChainMonitoring = chainStatus[chain]?.[network];
                    const isChainLoading = chainLoading[`${chain}_${network}`];

                    return (
                      <tr key={key}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{chain.toUpperCase()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{network}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {currentBlock > 0 ? currentBlock : 'Connection Error'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              className="border rounded px-2 py-1 w-32"
                              value={editingBlock.value}
                              onChange={(e) => setEditingBlock({
                                ...editingBlock,
                                value: e.target.value
                              })}
                            />
                          ) : (
                            savedBlock || 'Not set'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => handleToggleChainMonitoring(chain, network)}
                            disabled={isChainLoading}
                            className={`
                              px-4 py-2 rounded-md text-white font-medium
                              transition-colors duration-150 ease-in-out
                              focus:outline-none focus:ring-2 focus:ring-offset-2
                              ${isChainLoading ? 'cursor-not-allowed opacity-60' : ''}
                              ${isChainMonitoring 
                                ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500' 
                                : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
                              }
                            `}
                          >
                            {isChainLoading ? (
                              <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </div>
                            ) : (
                              isChainMonitoring ? "Stop" : "Start"
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {isEditing ? (
                            <div className="space-x-2">
                              <button
                                onClick={handleUpdateStartBlock}
                                disabled={isSaving}
                                className={`text-green-600 hover:text-green-900 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isSaving ? (
                                  <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                  </span>
                                ) : (
                                  'Save'
                                )}
                              </button>
                              <button
                                onClick={() => setEditingBlock(null)}
                                disabled={isSaving}
                                className={`text-gray-600 hover:text-gray-900 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingBlock({
                                chain,
                                network,
                                value: savedBlock || currentBlock.toString()
                              })}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No block information available
            </div>
          )}
        </div>

        {updateStatus && (
          <div className={`mt-4 p-4 rounded-md ${
            updateStatus.toLowerCase().includes('error')
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}>
            <p className="text-sm">{updateStatus}</p>
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