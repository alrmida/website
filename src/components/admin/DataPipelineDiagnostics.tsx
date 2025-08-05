
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, XCircle, Clock, Database, Wifi } from 'lucide-react';

interface PipelineDiagnostic {
  machineId: string;
  machineName: string;
  uid: string | null;
  lastRawData: string | null;
  lastProductionEvent: string | null;
  rawDataAge: number;
  productionEventAge: number;
  pipelineStatus: 'healthy' | 'degraded' | 'broken';
  issues: string[];
}

export const DataPipelineDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState<PipelineDiagnostic[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingPipeline, setTestingPipeline] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Running comprehensive pipeline diagnostics...');

      // Fetch all machines with their UIDs
      const { data: machines, error: machinesError } = await supabase
        .from('machines')
        .select(`
          machine_id,
          name,
          machine_microcontrollers!inner(
            microcontroller_uid
          )
        `)
        .is('machine_microcontrollers.unassigned_at', null);

      if (machinesError) {
        console.error('❌ Error fetching machines:', machinesError);
        toast.error('Failed to fetch machines');
        return;
      }

      console.log('📋 Found machines:', machines);

      const results: PipelineDiagnostic[] = [];

      for (const machine of machines || []) {
        const uid = machine.machine_microcontrollers[0]?.microcontroller_uid;
        
        // Check last raw data
        const { data: lastRaw } = await supabase
          .from('raw_machine_data')
          .select('timestamp_utc')
          .eq('machine_id', machine.machine_id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check last production event
        const { data: lastProduction } = await supabase
          .from('water_production_events')
          .select('timestamp_utc')
          .eq('machine_id', machine.machine_id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        const now = new Date();
        const rawDataAge = lastRaw ? 
          Math.floor((now.getTime() - new Date(lastRaw.timestamp_utc).getTime()) / (1000 * 60)) : 
          Infinity;
        const productionEventAge = lastProduction ? 
          Math.floor((now.getTime() - new Date(lastProduction.timestamp_utc).getTime()) / (1000 * 60)) : 
          Infinity;

        const issues: string[] = [];
        let pipelineStatus: 'healthy' | 'degraded' | 'broken' = 'healthy';

        // Analyze pipeline health
        if (!uid) {
          issues.push('No microcontroller UID assigned');
          pipelineStatus = 'broken';
        }

        if (rawDataAge > 60) {
          issues.push(`Raw data is ${Math.floor(rawDataAge / 60)} hours old`);
          pipelineStatus = rawDataAge > 24 * 60 ? 'broken' : 'degraded';
        }

        if (productionEventAge < 60 && rawDataAge > 60) {
          issues.push('Production events recent but raw data stale - pipeline broken');
          pipelineStatus = 'broken';
        }

        if (rawDataAge > 15 && rawDataAge <= 60) {
          issues.push('Raw data slightly stale (>15 minutes)');
          if (pipelineStatus === 'healthy') pipelineStatus = 'degraded';
        }

        results.push({
          machineId: machine.machine_id,
          machineName: machine.name,
          uid,
          lastRawData: lastRaw?.timestamp_utc || null,
          lastProductionEvent: lastProduction?.timestamp_utc || null,
          rawDataAge,
          productionEventAge,
          pipelineStatus,
          issues
        });
      }

      setDiagnostics(results);
      console.log('✅ Pipeline diagnostics completed:', results);

    } catch (error) {
      console.error('💥 Error running diagnostics:', error);
      toast.error('Failed to run diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const testGetMachineData = async (uid: string, machineId: string) => {
    setTestingPipeline(true);
    try {
      console.log(`🧪 Testing get-machine-data function for ${machineId} (${uid})`);
      
      const { data, error } = await supabase.functions.invoke('get-machine-data', {
        body: { uid }
      });

      if (error) {
        console.error('❌ Function call failed:', error);
        toast.error(`Function call failed: ${error.message}`);
      } else {
        console.log('✅ Function call successful:', data);
        toast.success('Function call successful - check if raw data was updated');
        
        // Refresh diagnostics after a moment
        setTimeout(runDiagnostics, 2000);
      }
    } catch (error) {
      console.error('💥 Error testing function:', error);
      toast.error('Failed to test function');
    } finally {
      setTestingPipeline(false);
    }
  };

  const formatAge = (minutes: number) => {
    if (minutes === Infinity) return 'Never';
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'broken':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'broken':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Pipeline Diagnostics
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Running...' : 'Refresh Diagnostics'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {diagnostics.map((diagnostic) => (
            <div key={diagnostic.machineId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostic.pipelineStatus)}
                  <div>
                    <h4 className="font-semibold">{diagnostic.machineName}</h4>
                    <p className="text-sm text-gray-600">{diagnostic.machineId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(diagnostic.pipelineStatus)}>
                    {diagnostic.pipelineStatus.toUpperCase()}
                  </Badge>
                  {diagnostic.uid && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => testGetMachineData(diagnostic.uid!, diagnostic.machineId)}
                      disabled={testingPipeline}
                    >
                      Test Pipeline
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Raw Data</div>
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    <span className={diagnostic.rawDataAge > 60 ? 'text-red-600' : 'text-green-600'}>
                      {formatAge(diagnostic.rawDataAge)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Production Events</div>
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    <span className={diagnostic.productionEventAge > 60 ? 'text-red-600' : 'text-green-600'}>
                      {formatAge(diagnostic.productionEventAge)}
                    </span>
                  </div>
                </div>
              </div>

              {diagnostic.uid && (
                <div className="text-xs text-gray-500 mb-2">
                  UID: <span className="font-mono">{diagnostic.uid}</span>
                </div>
              )}

              {diagnostic.issues.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-red-700">Issues:</div>
                  {diagnostic.issues.map((issue, index) => (
                    <div key={index} className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {diagnostics.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            No machines found. Click "Refresh Diagnostics" to try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
