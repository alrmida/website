
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wrench, Play, CheckCircle, XCircle } from 'lucide-react';

interface RepairResult {
  machineId: string;
  success: boolean;
  message: string;
  newDataTimestamp?: string;
}

export const PipelineRepair = () => {
  const [repairing, setRepairing] = useState(false);
  const [repairResults, setRepairResults] = useState<RepairResult[]>([]);

  const repairAllPipelines = async () => {
    setRepairing(true);
    setRepairResults([]);
    
    try {
      console.log('🔧 Starting pipeline repair for all machines...');

      // Get all machines with UIDs
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

      const results: RepairResult[] = [];

      for (const machine of machines || []) {
        const uid = machine.machine_microcontrollers[0]?.microcontroller_uid;
        
        if (!uid) {
          results.push({
            machineId: machine.machine_id,
            success: false,
            message: 'No UID assigned to this machine'
          });
          continue;
        }

        try {
          console.log(`🔧 Repairing pipeline for ${machine.machine_id} (${uid})`);

          // Call get-machine-data function to force data refresh
          const { data, error } = await supabase.functions.invoke('get-machine-data', {
            body: { uid }
          });

          if (error) {
            console.error(`❌ Failed to repair ${machine.machine_id}:`, error);
            results.push({
              machineId: machine.machine_id,
              success: false,
              message: `Function call failed: ${error.message}`
            });
          } else if (data?.status === 'ok' && data?.data?._time) {
            console.log(`✅ Successfully repaired ${machine.machine_id}`);
            results.push({
              machineId: machine.machine_id,
              success: true,
              message: 'Pipeline repaired successfully',
              newDataTimestamp: data.data._time
            });
          } else if (data?.status === 'no_data') {
            results.push({
              machineId: machine.machine_id,
              success: false,
              message: 'No recent data available in InfluxDB'
            });
          } else {
            results.push({
              machineId: machine.machine_id,
              success: false,
              message: 'Function returned unexpected response'
            });
          }
        } catch (error) {
          console.error(`💥 Exception repairing ${machine.machine_id}:`, error);
          results.push({
            machineId: machine.machine_id,
            success: false,
            message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }

        // Small delay between calls to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setRepairResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        toast.success(`All ${totalCount} pipelines repaired successfully!`);
      } else if (successCount > 0) {
        toast.success(`${successCount}/${totalCount} pipelines repaired successfully`);
      } else {
        toast.error('Failed to repair any pipelines');
      }

    } catch (error) {
      console.error('💥 Error during pipeline repair:', error);
      toast.error('Failed to run pipeline repair');
    } finally {
      setRepairing(false);
    }
  };

  const repairSingleMachine = async (machineId: string) => {
    try {
      // Get machine UID
      const { data: machine, error: machineError } = await supabase
        .from('machines')
        .select(`
          machine_microcontrollers!inner(
            microcontroller_uid
          )
        `)
        .eq('machine_id', machineId)
        .is('machine_microcontrollers.unassigned_at', null)
        .single();

      if (machineError || !machine) {
        toast.error('Failed to find machine or UID');
        return;
      }

      const uid = machine.machine_microcontrollers[0]?.microcontroller_uid;
      if (!uid) {
        toast.error('No UID assigned to this machine');
        return;
      }

      console.log(`🔧 Repairing single machine ${machineId} (${uid})`);

      const { data, error } = await supabase.functions.invoke('get-machine-data', {
        body: { uid }
      });

      if (error) {
        toast.error(`Repair failed: ${error.message}`);
      } else if (data?.status === 'ok') {
        toast.success(`Pipeline repaired for ${machineId}`);
        
        // Update the results if this machine was already in the list
        setRepairResults(prev => 
          prev.map(result => 
            result.machineId === machineId 
              ? { ...result, success: true, message: 'Pipeline repaired successfully', newDataTimestamp: data.data._time }
              : result
          )
        );
      } else {
        toast.error('Function returned unexpected response');
      }
    } catch (error) {
      console.error('💥 Error repairing single machine:', error);
      toast.error('Failed to repair machine');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Pipeline Repair Tool
        </CardTitle>
        <p className="text-sm text-gray-600">
          Force refresh raw data ingestion for machines with broken pipelines
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={repairAllPipelines}
          disabled={repairing}
          className="w-full"
          size="lg"
        >
          <Play className="h-4 w-4 mr-2" />
          {repairing ? 'Repairing All Pipelines...' : 'Repair All Pipelines'}
        </Button>

        {repairResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Repair Results:</h4>
            {repairResults.map((result) => (
              <div 
                key={result.machineId} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">{result.machineId}</div>
                    <div className="text-sm text-gray-600">{result.message}</div>
                    {result.newDataTimestamp && (
                      <div className="text-xs text-green-600">
                        New data: {new Date(result.newDataTimestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                {!result.success && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => repairSingleMachine(result.machineId)}
                  >
                    Retry
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
