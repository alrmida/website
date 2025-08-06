
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Play, Database } from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

export const PipelineDiagnosticTool = () => {
  const [testing, setTesting] = useState(false);
  const [testUID, setTestUID] = useState('353636343034510E002A0020');
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const problemUIDs = [
    { uid: '353636343034510E002A0020', machineId: 'KU001619000094', name: 'R&D embraco' },
    { uid: '353636343034510D005F0039', machineId: 'KU001619000001', name: 'test' }
  ];

  const runFullDiagnostic = async (uid: string) => {
    const diagnosticResults: DiagnosticResult[] = [];
    
    try {
      // Step 1: Check if machine exists in database
      diagnosticResults.push({
        step: 'Database Machine Lookup',
        status: 'success',
        message: 'Checking if machine with UID exists in database...'
      });

      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select(`
          machine_id,
          name,
          machine_microcontrollers!inner(
            microcontroller_uid,
            assigned_at
          )
        `)
        .eq('machine_microcontrollers.microcontroller_uid', uid)
        .is('machine_microcontrollers.unassigned_at', null)
        .single();

      if (machineError || !machineData) {
        diagnosticResults.push({
          step: 'Database Machine Lookup',
          status: 'error',
          message: `Machine with UID ${uid} not found in database or not properly assigned`,
          data: { error: machineError }
        });
        return diagnosticResults;
      }

      diagnosticResults.push({
        step: 'Database Machine Lookup',
        status: 'success',
        message: `Found machine: ${machineData.name} (${machineData.machine_id})`,
        data: machineData
      });

      // Step 2: Check last raw_machine_data entry
      const { data: lastRawData, error: rawDataError } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', machineData.machine_id)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      let dataAge = 'Never';
      if (lastRawData) {
        const ageMs = now.getTime() - new Date(lastRawData.timestamp_utc).getTime();
        const ageMinutes = Math.floor(ageMs / (1000 * 60));
        dataAge = ageMinutes < 60 ? `${ageMinutes} minutes` : `${Math.floor(ageMinutes / 60)} hours`;
      }

      diagnosticResults.push({
        step: 'Raw Data Check',
        status: lastRawData ? (new Date(lastRawData.timestamp_utc).getTime() > now.getTime() - 60 * 60 * 1000 ? 'success' : 'warning') : 'error',
        message: `Last raw data: ${dataAge} ago`,
        data: lastRawData
      });

      // Step 3: Test get-machine-data function
      diagnosticResults.push({
        step: 'Edge Function Test',
        status: 'success',
        message: 'Testing get-machine-data function...'
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('get-machine-data', {
        body: { uid }
      });

      if (functionError) {
        diagnosticResults.push({
          step: 'Edge Function Test',
          status: 'error',
          message: `Function call failed: ${functionError.message}`,
          data: { error: functionError }
        });
      } else if (functionData?.status === 'no_data') {
        diagnosticResults.push({
          step: 'Edge Function Test',
          status: 'warning',
          message: 'Function succeeded but no data found in InfluxDB',
          data: functionData
        });
      } else if (functionData?.status === 'ok') {
        diagnosticResults.push({
          step: 'Edge Function Test',
          status: 'success',
          message: `Function succeeded! Retrieved data from ${functionData.data._time}`,
          data: functionData
        });
      } else {
        diagnosticResults.push({
          step: 'Edge Function Test',
          status: 'warning',
          message: 'Function returned unexpected response',
          data: functionData
        });
      }

      // Step 4: Check if new data was created
      if (functionData?.status === 'ok') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        const { data: newRawData } = await supabase
          .from('raw_machine_data')
          .select('*')
          .eq('machine_id', machineData.machine_id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        const isNewData = newRawData && (!lastRawData || new Date(newRawData.timestamp_utc) > new Date(lastRawData.timestamp_utc));

        diagnosticResults.push({
          step: 'Data Pipeline Verification',
          status: isNewData ? 'success' : 'error',
          message: isNewData ? 'New data successfully stored in database!' : 'No new data was stored despite function success',
          data: { newData: newRawData, isNew: isNewData }
        });
      }

    } catch (error) {
      diagnosticResults.push({
        step: 'Diagnostic Error',
        status: 'error',
        message: `Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error }
      });
    }

    return diagnosticResults;
  };

  const runDiagnostic = async () => {
    if (!testUID) {
      toast.error('Please enter a UID to test');
      return;
    }

    setTesting(true);
    setResults([]);
    
    console.log('🔍 Starting diagnostic for UID:', testUID);
    
    try {
      const diagnosticResults = await runFullDiagnostic(testUID);
      setResults(diagnosticResults);
      
      const hasErrors = diagnosticResults.some(r => r.status === 'error');
      const hasWarnings = diagnosticResults.some(r => r.status === 'warning');
      
      if (hasErrors) {
        toast.error('Diagnostic found critical issues');
      } else if (hasWarnings) {
        toast.warning('Diagnostic completed with warnings');
      } else {
        toast.success('All diagnostic checks passed!');
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Failed to run diagnostic');
    } finally {
      setTesting(false);
    }
  };

  const testAllProblemUIDs = async () => {
    setTesting(true);
    setResults([]);
    
    const allResults: DiagnosticResult[] = [];
    
    for (const machine of problemUIDs) {
      allResults.push({
        step: 'Machine Test',
        status: 'success',
        message: `Testing ${machine.name} (${machine.machineId})...`
      });
      
      const machineResults = await runFullDiagnostic(machine.uid);
      allResults.push(...machineResults);
      
      allResults.push({
        step: 'Separator',
        status: 'success',
        message: '─'.repeat(50)
      });
    }
    
    setResults(allResults);
    setTesting(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Database className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Pipeline Diagnostic Tool
        </CardTitle>
        <p className="text-sm text-gray-600">
          Test the data pipeline for specific machine UIDs to identify where data flow is breaking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testAllProblemUIDs}
              disabled={testing}
              variant="destructive"
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {testing ? 'Testing...' : 'Test Problem Machines'}
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <Label htmlFor="uid-input">Test Specific UID:</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="uid-input"
                value={testUID}
                onChange={(e) => setTestUID(e.target.value)}
                placeholder="Enter machine UID"
                className="font-mono text-sm"
              />
              <Button 
                onClick={runDiagnostic}
                disabled={testing || !testUID}
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold">Diagnostic Results:</h4>
            <div className="max-h-96 overflow-auto border rounded-lg p-4 space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3">
                  {result.step !== 'Separator' && getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${
                        result.step === 'Separator' ? 'text-gray-400' : ''
                      }`}>
                        {result.step}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      result.status === 'error' ? 'text-red-600' : 
                      result.status === 'warning' ? 'text-yellow-600' : 
                      result.step === 'Separator' ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      {result.message}
                    </p>
                    {result.data && result.step !== 'Separator' && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View raw data
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
          <strong>Quick Reference - Problem UIDs:</strong>
          <ul className="mt-2 space-y-1">
            {problemUIDs.map(machine => (
              <li key={machine.uid} className="font-mono text-xs">
                {machine.name} ({machine.machineId}): {machine.uid}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
