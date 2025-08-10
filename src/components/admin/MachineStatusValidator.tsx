
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Activity, Clock, RefreshCw, Database } from 'lucide-react';

interface MachineValidationResult {
  machineId: string;
  machineName: string;
  hasRawData: boolean;
  latestDataAge: number | null;
  dataCount: number;
  calculatedStatus: string;
  isOnline: boolean;
  lastDataTimestamp: string | null;
  errorMessage?: string;
}

export const MachineStatusValidator = () => {
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<MachineValidationResult[]>([]);

  const validateMachines = async () => {
    setTesting(true);
    setResults([]);
    
    const validationResults: MachineValidationResult[] = [];
    
    try {
      // Get all machines
      const { data: machines, error: machineError } = await supabase
        .from('machines')
        .select('*');

      if (machineError) {
        console.error('Error fetching machines:', machineError);
        return;
      }

      if (!machines || machines.length === 0) {
        console.log('No machines found');
        return;
      }

      // Check each machine's status
      for (const machine of machines) {
        try {
          console.log(`🔍 Validating machine: ${machine.machine_id} (${machine.name})`);
          
          // Get latest raw data for this machine
          const { data: rawData, error: rawError } = await supabase
            .from('raw_machine_data')
            .select('*')
            .eq('machine_id', machine.machine_id)
            .order('timestamp_utc', { ascending: false })
            .limit(5);

          const hasRawData = !rawError && rawData && rawData.length > 0;
          const latestRecord = hasRawData ? rawData[0] : null;
          const dataAge = latestRecord 
            ? Math.round((new Date().getTime() - new Date(latestRecord.timestamp_utc).getTime()) / (1000 * 60))
            : null;

          // Calculate status based on latest data
          let calculatedStatus = 'Unknown';
          let isOnline = false;
          
          if (latestRecord && dataAge !== null) {
            // Check if data is fresh (within 15 minutes)
            isOnline = dataAge <= 15;
            
            if (!isOnline) {
              calculatedStatus = 'Disconnected';
            } else if (latestRecord.defrosting === true) {
              calculatedStatus = 'Defrosting';
            } else if (latestRecord.full_tank === true) {
              calculatedStatus = 'Full Water';
            } else if (latestRecord.producing_water === true) {
              calculatedStatus = 'Producing';
            } else {
              calculatedStatus = 'Idle';
            }
          } else {
            calculatedStatus = 'No Data';
          }

          validationResults.push({
            machineId: machine.machine_id,
            machineName: machine.name,
            hasRawData,
            latestDataAge: dataAge,
            dataCount: rawData?.length || 0,
            calculatedStatus,
            isOnline,
            lastDataTimestamp: latestRecord?.timestamp_utc || null,
            errorMessage: rawError ? rawError.message : undefined
          });

        } catch (error) {
          console.error(`Error validating machine ${machine.machine_id}:`, error);
          validationResults.push({
            machineId: machine.machine_id,
            machineName: machine.name,
            hasRawData: false,
            latestDataAge: null,
            dataCount: 0,
            calculatedStatus: 'Error',
            isOnline: false,
            lastDataTimestamp: null,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

    } catch (error) {
      console.error('Error in machine validation:', error);
    }

    setResults(validationResults);
    setTesting(false);
  };

  const triggerSync = async () => {
    setSyncing(true);
    
    try {
      console.log('🔄 Triggering sync-all-machines from validator...');
      
      const { data, error: invokeError } = await supabase.functions.invoke('sync-all-machines', {
        body: {}
      });

      if (invokeError) {
        console.error('❌ Error invoking sync function:', invokeError);
        throw new Error(`Sync function error: ${invokeError.message}`);
      }

      console.log('✅ Sync completed, re-validating machines...');
      
      // Wait a moment for data to propagate, then re-validate
      setTimeout(() => {
        validateMachines();
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (result: MachineValidationResult) => {
    if (result.errorMessage) return 'text-red-600';
    if (!result.hasRawData) return 'text-gray-500';
    if (!result.isOnline) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (result: MachineValidationResult) => {
    if (result.errorMessage) return <AlertTriangle className="h-4 w-4 text-red-600" />;
    if (!result.hasRawData) return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    if (!result.isOnline) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Machine Status Validator
        </CardTitle>
        <p className="text-sm text-gray-600">
          Validate machine status and trigger data sync for all machines
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={validateMachines}
            disabled={testing || syncing}
            className="flex-1"
          >
            <Activity className="h-4 w-4 mr-2" />
            {testing ? 'Validating...' : 'Validate All Machines'}
          </Button>
          
          <Button 
            onClick={triggerSync}
            disabled={testing || syncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold">Machine Status Analysis:</h4>
            <div className="grid gap-4">
              {results.map((result) => (
                <div key={result.machineId} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result)}
                      <div>
                        <h5 className="font-medium">
                          {result.machineName} ({result.machineId})
                        </h5>
                        <p className={`text-sm ${getStatusColor(result)}`}>
                          Status: {result.calculatedStatus}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {result.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Raw Data:</span> 
                      {result.hasRawData ? `${result.dataCount} records` : 'No data'}
                    </div>
                    <div>
                      <span className="font-medium">Data Age:</span> 
                      {result.latestDataAge !== null ? `${result.latestDataAge} min` : 'N/A'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Last Update:</span> 
                      {result.lastDataTimestamp || 'Never'}
                    </div>
                  </div>

                  {result.errorMessage && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                      <strong>Error:</strong> {result.errorMessage}
                    </div>
                  )}

                  {result.machineId === 'KU001619000097' && result.isOnline && (
                    <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                      ✅ ID97 is working correctly - this is our baseline
                    </div>
                  )}

                  {result.machineId === 'KU001619000094' && !result.isOnline && (
                    <div className="text-yellow-600 text-sm bg-yellow-50 p-2 rounded">
                      ⚠️ ID94 showing as offline - try "Sync Data" to fetch latest
                    </div>
                  )}

                  {result.machineId === 'KU001619000094' && result.isOnline && (
                    <div className="text-green-600 text-sm bg-green-50 p-2 rounded">
                      ✅ ID94 is now online - sync pipeline working correctly!
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-2">Analysis Summary:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Both machines should appear if they have valid machine IDs</li>
                <li>• Data age {'>'} 15 minutes = Disconnected status</li>
                <li>• Data age ≤ 15 minutes = Online with calculated status</li>
                <li>• Status priority: Defrosting {'>'} Full Water {'>'} Producing {'>'} Idle</li>
                <li>• Missing raw data = RLS policy or data ingestion issue</li>
                <li>• Use "Sync Data" to manually fetch latest data from InfluxDB</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
