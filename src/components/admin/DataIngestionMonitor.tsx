
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Activity, RefreshCw, Database, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { MachineWithClient } from '@/types/machine';

interface DataIngestionMonitorProps {
  selectedMachine?: MachineWithClient;
}

interface SyncResult {
  machineId: string;
  name: string;
  status: 'success' | 'error' | 'no_data';
  action?: string;
  timestamp?: string;
  waterLevel?: number;
  error?: string;
  message?: string;
}

interface SyncResponse {
  status: string;
  processedMachines: number;
  successCount: number;
  errorCount: number;
  results: SyncResult[];
  timestamp: string;
}

const DataIngestionMonitor = ({ selectedMachine }: DataIngestionMonitorProps) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerSync = async () => {
    setSyncing(true);
    setError(null);
    
    try {
      console.log('🔄 Triggering sync-all-machines...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('sync-all-machines', {
        body: {}
      });

      if (invokeError) {
        console.error('❌ Error invoking sync function:', invokeError);
        throw new Error(`Sync function error: ${invokeError.message}`);
      }

      console.log('✅ Sync completed:', data);
      setLastSync(data);
      
    } catch (err: any) {
      console.error('❌ Sync failed:', err);
      setError(err.message || 'Failed to sync machines');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'no_data':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'no_data':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Consolidated Data Ingestion Monitor
          </CardTitle>
          <p className="text-sm text-gray-600">
            Sync all active machines from InfluxDB to raw_machine_data table
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Manual Sync Control</p>
              <p className="text-xs text-gray-500">
                Fetch latest data for all machines with active microcontroller UIDs
              </p>
            </div>
            
            <Button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All Machines'}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {lastSync && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-800 mb-2">Last Sync Results</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Timestamp:</span><br />
                    <span className="text-blue-700">
                      {new Date(lastSync.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Processed:</span><br />
                    <span className="text-blue-700">{lastSync.processedMachines} machines</span>
                  </div>
                  <div>
                    <span className="font-medium">Successful:</span><br />
                    <span className="text-green-600">{lastSync.successCount}</span>
                  </div>
                  <div>
                    <span className="font-medium">Errors:</span><br />
                    <span className="text-red-600">{lastSync.errorCount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium">Machine Results:</h5>
                {lastSync.results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <h6 className="font-medium">{result.name}</h6>
                          <p className="text-sm text-gray-500">{result.machineId}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                        {result.status.toUpperCase()}
                      </div>
                    </div>

                    {result.status === 'success' && (
                      <div className="text-sm space-y-1">
                        <p><strong>Action:</strong> {result.action}</p>
                        <p><strong>Water Level:</strong> {result.waterLevel}L</p>
                        <p><strong>Timestamp:</strong> {result.timestamp}</p>
                      </div>
                    )}

                    {result.status === 'error' && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}

                    {result.status === 'no_data' && (
                      <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        <strong>Issue:</strong> {result.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                <strong>Next Steps:</strong>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Check the machine status in the main dashboard</li>
                  <li>Verify ID94 now shows as online if data was found</li>
                  <li>Set up automated sync via pg_cron once validated</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataIngestionMonitor;
