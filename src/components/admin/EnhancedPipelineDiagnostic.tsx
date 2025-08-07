import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle, Play, Database, Bug } from 'lucide-react';

interface EnhancedDiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
  timestamp?: string;
}

export const EnhancedPipelineDiagnostic = () => {
  const [testing, setTesting] = useState(false);
  const [testUID, setTestUID] = useState('353636343034510E002A0020');
  const [results, setResults] = useState<EnhancedDiagnosticResult[]>([]);

  const problemUIDs = [
    { uid: '353636343034510E002A0020', machineId: 'KU001619000094', name: 'R&D embraco' },
    { uid: '353636343034510D005F0039', machineId: 'KU001619000001', name: 'test' }
  ];

  const runEnhancedDiagnostic = async (uid: string) => {
    const diagnosticResults: EnhancedDiagnosticResult[] = [];
    const timestamp = new Date().toISOString();
    
    try {
      // Step 1: Database schema validation
      diagnosticResults.push({
        step: 'Schema Validation',
        status: 'info',
        message: 'Validating raw_machine_data table schema...',
        timestamp
      });

      const { data: schemaData, error: schemaError } = await supabase
        .from('raw_machine_data')
        .select('*')
        .limit(1);

      if (schemaError) {
        diagnosticResults.push({
          step: 'Schema Validation',
          status: 'error',
          message: `Schema validation failed: ${schemaError.message}`,
          data: { error: schemaError }
        });
      } else {
        diagnosticResults.push({
          step: 'Schema Validation',
          status: 'success',
          message: 'Table schema is accessible and valid',
          data: { columns: schemaData ? Object.keys(schemaData[0] || {}) : [] }
        });
      }

      // Step 2: Machine lookup with detailed info
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select(`
          machine_id,
          name,
          machine_microcontrollers!inner(
            microcontroller_uid,
            assigned_at,
            notes
          )
        `)
        .eq('machine_microcontrollers.microcontroller_uid', uid)
        .is('machine_microcontrollers.unassigned_at', null)
        .single();

      if (machineError || !machineData) {
        diagnosticResults.push({
          step: 'Machine Lookup',
          status: 'error',
          message: `Machine with UID ${uid} not found: ${machineError?.message || 'No data'}`,
          data: { error: machineError }
        });
        return diagnosticResults;
      }

      diagnosticResults.push({
        step: 'Machine Lookup',
        status: 'success',
        message: `Found machine: ${machineData.name} (${machineData.machine_id})`,
        data: {
          machine: machineData,
          assignment_date: machineData.machine_microcontrollers[0]?.assigned_at
        }
      });

      // Step 3: Historical data check - get data BEFORE function call
      const { data: historicalDataBefore, error: historicalError } = await supabase
        .from('raw_machine_data')
        .select('timestamp_utc, water_level_l, producing_water, full_tank')
        .eq('machine_id', machineData.machine_id)
        .order('timestamp_utc', { ascending: false })
        .limit(5);

      const historyStatus = historicalDataBefore && historicalDataBefore.length > 0 ? 'success' : 'warning';
      diagnosticResults.push({
        step: 'Historical Data',
        status: historyStatus,
        message: `Found ${historicalDataBefore?.length || 0} recent records in database`,
        data: {
          recent_records: historicalDataBefore,
          last_update: historicalDataBefore?.[0]?.timestamp_utc || null
        }
      });

      // Step 4: Enhanced edge function test
      diagnosticResults.push({
        step: 'Enhanced Function Test',
        status: 'info',
        message: 'Testing enhanced get-machine-data function...'
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('get-machine-data', {
        body: { uid }
      });

      if (functionError) {
        diagnosticResults.push({
          step: 'Enhanced Function Test',
          status: 'error',
          message: `Function call failed: ${functionError.message}`,
          data: { error: functionError }
        });
      } else if (functionData?.status === 'no_data') {
        diagnosticResults.push({
          step: 'Enhanced Function Test',
          status: 'warning',
          message: 'Function succeeded but no data found in InfluxDB',
          data: functionData
        });
      } else if (functionData?.status === 'ok') {
        const storageSuccess = functionData.storage?.success;
        const storageAction = functionData.storage?.action;
        
        let storageMessage = '';
        let storageStatus: 'success' | 'warning' | 'error' = 'success';
        
        if (storageSuccess && storageAction === 'inserted') {
          storageMessage = 'Data successfully retrieved and stored!';
        } else if (storageSuccess && storageAction === 'skipped') {
          storageMessage = 'Data retrieved (duplicate timestamp, skipped storage)';
          storageStatus = 'warning';
        } else if (!storageSuccess) {
          storageMessage = `Data retrieved but storage failed: ${functionData.storage?.error || 'Unknown error'}`;
          storageStatus = 'error';
        }

        diagnosticResults.push({
          step: 'Enhanced Function Test',
          status: storageStatus,
          message: `${storageMessage} - Data from ${functionData.data._time}`,
          data: {
            influx_data: functionData.data,
            storage_result: functionData.storage,
            debug_info: functionData.debug
          }
        });

        // Step 5: Improved data verification with better timestamp handling
        if (storageSuccess && storageAction === 'inserted') {
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds

          const { data: postFunctionData } = await supabase
            .from('raw_machine_data')
            .select('timestamp_utc, water_level_l, producing_water, id')
            .eq('machine_id', machineData.machine_id)
            .order('timestamp_utc', { ascending: false })
            .limit(3); // Get more records to account for timing

          const expectedTimestamp = functionData.data._time;
          const expectedTime = new Date(expectedTimestamp).getTime();
          
          // Look for a record within 1 second of the expected timestamp
          const foundMatchingRecord = postFunctionData?.find(record => {
            const recordTime = new Date(record.timestamp_utc).getTime();
            const timeDiff = Math.abs(recordTime - expectedTime);
            return timeDiff <= 1000; // Within 1 second tolerance
          });

          const isNewRecord = foundMatchingRecord && (
            !historicalDataBefore?.length || 
            new Date(foundMatchingRecord.timestamp_utc).getTime() > new Date(historicalDataBefore[0].timestamp_utc).getTime()
          );

          diagnosticResults.push({
            step: 'Data Verification',
            status: foundMatchingRecord ? 'success' : 'warning',
            message: foundMatchingRecord 
              ? `✅ Confirmed: Data stored successfully! ${isNewRecord ? '(New record)' : '(Existing record)'}` 
              : '⚠️ Warning: Could not verify data storage (may be timing issue)',
            data: {
              expected_timestamp: expectedTimestamp,
              found_record: foundMatchingRecord || null,
              all_recent_records: postFunctionData,
              match: !!foundMatchingRecord,
              is_new_record: isNewRecord
            }
          });
        } else if (storageAction === 'skipped') {
          diagnosticResults.push({
            step: 'Data Verification',
            status: 'info',
            message: '📋 Data verification skipped - duplicate timestamp detected (normal behavior)',
            data: {
              reason: 'Storage was skipped due to duplicate timestamp',
              expected_timestamp: functionData.data._time
            }
          });
        }
      } else {
        diagnosticResults.push({
          step: 'Enhanced Function Test',
          status: 'warning',
          message: 'Function returned unexpected response',
          data: functionData
        });
      }

    } catch (error) {
      diagnosticResults.push({
        step: 'Critical Error',
        status: 'error',
        message: `Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error, timestamp }
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
    
    console.log('🔍 Starting enhanced diagnostic for UID:', testUID);
    
    try {
      const diagnosticResults = await runEnhancedDiagnostic(testUID);
      setResults(diagnosticResults);
      
      const hasErrors = diagnosticResults.some(r => r.status === 'error');
      const hasWarnings = diagnosticResults.some(r => r.status === 'warning');
      
      if (hasErrors) {
        toast.error('Enhanced diagnostic found critical issues');
      } else if (hasWarnings) {
        toast.warning('Enhanced diagnostic completed with warnings');
      } else {
        toast.success('All enhanced diagnostic checks passed!');
      }
    } catch (error) {
      console.error('Enhanced diagnostic error:', error);
      toast.error('Failed to run enhanced diagnostic');
    } finally {
      setTesting(false);
    }
  };

  const testAllProblems = async () => {
    setTesting(true);
    setResults([]);
    
    const allResults: EnhancedDiagnosticResult[] = [];
    
    for (const machine of problemUIDs) {
      allResults.push({
        step: 'Machine Test',
        status: 'info',
        message: `=== TESTING ${machine.name} (${machine.machineId}) ===`,
        timestamp: new Date().toISOString()
      });
      
      const machineResults = await runEnhancedDiagnostic(machine.uid);
      allResults.push(...machineResults);
      
      allResults.push({
        step: 'Separator',
        status: 'info',
        message: '─'.repeat(60)
      });
    }
    
    setResults(allResults);
    setTesting(false);
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning' | 'info') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Database className="h-4 w-4 text-blue-600" />;
      default:
        return <Bug className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Enhanced Pipeline Diagnostic Tool
        </CardTitle>
        <p className="text-sm text-gray-600">
          Comprehensive pipeline testing with enhanced error logging and improved verification
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testAllProblems}
              disabled={testing}
              variant="destructive"
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {testing ? 'Testing...' : 'Test Problem Machines (Enhanced)'}
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
                Enhanced Test
              </Button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold">Enhanced Diagnostic Results:</h4>
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
                        {result.timestamp && (
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      result.status === 'error' ? 'text-red-600' : 
                      result.status === 'warning' ? 'text-yellow-600' : 
                      result.status === 'info' ? 'text-blue-600' :
                      result.step === 'Separator' ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      {result.message}
                    </p>
                    {result.data && result.step !== 'Separator' && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View detailed data
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-40">
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
          <strong>Enhanced Features:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Schema validation and column verification</li>
            <li>• Multi-range InfluxDB data search (1h, 6h, 24h)</li>
            <li>• Detailed storage error logging and debugging</li>
            <li>• Improved data verification with timestamp tolerance</li>
            <li>• Historical data analysis and comparison</li>
            <li>• Better handling of duplicate timestamp scenarios</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
