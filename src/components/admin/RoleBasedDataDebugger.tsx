
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, User, Database } from 'lucide-react';

interface DebugResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

export const RoleBasedDataDebugger = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);

  const runRoleDebug = async () => {
    setTesting(true);
    setResults([]);
    
    const debugResults: DebugResult[] = [];
    
    try {
      // Step 1: Get current user and profile
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role, username, id')
        .eq('id', currentUser.user?.id)
        .single();

      debugResults.push({
        step: 'User Identity',
        status: 'success',
        message: `Logged in as: ${currentProfile?.username} (${currentProfile?.role})`,
        data: { profile: currentProfile, userId: currentUser.user?.id }
      });

      // Step 2: Check machine access
      const { data: machines, error: machineError } = await supabase
        .from('machines')
        .select('*');

      debugResults.push({
        step: 'Machine Access',
        status: machineError ? 'error' : 'success',
        message: `Can access ${machines?.length || 0} machines`,
        data: { machines, error: machineError }
      });

      // Step 3: Check raw_machine_data access for each available machine
      if (machines && machines.length > 0) {
        for (const machine of machines) {
          const { data: rawData, error: rawError } = await supabase
            .from('raw_machine_data')
            .select('id, timestamp_utc, water_level_l, producing_water, full_tank, machine_id')
            .eq('machine_id', machine.machine_id)
            .order('timestamp_utc', { ascending: false })
            .limit(3);

          const dataAge = rawData && rawData.length > 0 
            ? Math.round((new Date().getTime() - new Date(rawData[0].timestamp_utc).getTime()) / (1000 * 60))
            : null;

          debugResults.push({
            step: `Raw Data Access - ${machine.name} (${machine.machine_id})`,
            status: rawError ? 'error' : (rawData && rawData.length > 0 ? 'success' : 'warning'),
            message: rawError 
              ? `Cannot access raw data: ${rawError.message}`
              : `Found ${rawData?.length || 0} records${dataAge !== null ? `, newest is ${dataAge} minutes old` : ''}`,
            data: {
              machine_id: machine.machine_id,
              machine_name: machine.name,
              records_found: rawData?.length || 0,
              newest_record: rawData?.[0] || null,
              data_age_minutes: dataAge,
              error: rawError
            }
          });
        }
      }

      // Step 4: Check recent data across all machines (last hour)
      const { data: allRecentData, error: allDataError } = await supabase
        .from('raw_machine_data')
        .select('machine_id, timestamp_utc, id, water_level_l')
        .gte('timestamp_utc', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('timestamp_utc', { ascending: false })
        .limit(20);

      const machinesWithRecentData = [...new Set(allRecentData?.map(d => d.machine_id) || [])];
      
      debugResults.push({
        step: 'Recent Data Summary (Last Hour)',
        status: allDataError ? 'error' : 'success',
        message: `Found ${allRecentData?.length || 0} records from ${machinesWithRecentData.length} machines`,
        data: {
          recent_data: allRecentData,
          error: allDataError,
          machines_with_recent_data: machinesWithRecentData,
          data_breakdown: machinesWithRecentData.map(machineId => ({
            machine_id: machineId,
            record_count: allRecentData?.filter(d => d.machine_id === machineId).length || 0,
            latest_timestamp: allRecentData?.find(d => d.machine_id === machineId)?.timestamp_utc
          }))
        }
      });

      // Step 5: Test production analytics access
      const { data: productionEvents, error: productionError } = await supabase
        .from('water_production_events')
        .select('*')
        .order('timestamp_utc', { ascending: false })
        .limit(10);

      debugResults.push({
        step: 'Production Events Access',
        status: productionError ? 'error' : 'success',
        message: productionError 
          ? `Cannot access production events: ${productionError.message}`
          : `Found ${productionEvents?.length || 0} production events`,
        data: {
          events: productionEvents,
          error: productionError
        }
      });

      // Step 6: Check water level snapshots
      const { data: waterLevelSnapshots, error: snapshotError } = await supabase
        .from('water_level_snapshots')
        .select('*')
        .order('timestamp_utc', { ascending: false })
        .limit(5);

      debugResults.push({
        step: 'Water Level Snapshots Access',
        status: snapshotError ? 'error' : 'success',
        message: snapshotError 
          ? `Cannot access snapshots: ${snapshotError.message}`
          : `Found ${waterLevelSnapshots?.length || 0} water level snapshots`,
        data: {
          snapshots: waterLevelSnapshots,
          error: snapshotError
        }
      });

    } catch (error) {
      debugResults.push({
        step: 'Debug Error',
        status: 'error',
        message: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error }
      });
    }

    setResults(debugResults);
    setTesting(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning' | 'info') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Database className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Role-Based Data Access Debugger
        </CardTitle>
        <p className="text-sm text-gray-600">
          Debug role-based data visibility issues and validate machine monitoring pipeline
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runRoleDebug}
          disabled={testing}
          className="w-full"
        >
          <Database className="h-4 w-4 mr-2" />
          {testing ? 'Running Debug...' : 'Run Machine Data Access Debug'}
        </Button>

        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold">Debug Results:</h4>
            <div className="max-h-96 overflow-auto border rounded-lg p-4 space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {result.step}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      result.status === 'error' ? 'text-red-600' : 
                      result.status === 'warning' ? 'text-yellow-600' : 
                      result.status === 'info' ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {result.message}
                    </p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View detailed data
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
          <strong>Testing Focus:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• RLS policy access for admin vs commercial accounts</li>
            <li>• Data freshness and age calculations for each machine</li>
            <li>• End-to-end pipeline from raw data to production analytics</li>
            <li>• Machine status calculation availability</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
