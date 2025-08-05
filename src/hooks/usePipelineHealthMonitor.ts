
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PipelineHealth {
  machineId: string;
  machineName: string;
  isHealthy: boolean;
  lastRawDataAge: number;
  lastProductionAge: number;
  issues: string[];
}

export const usePipelineHealthMonitor = () => {
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkPipelineHealth = useCallback(async () => {
    try {
      console.log('🔍 Checking pipeline health...');

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
        console.error('❌ Error fetching machines for health check:', machinesError);
        return;
      }

      const healthResults: PipelineHealth[] = [];

      for (const machine of machines || []) {
        // Check raw data freshness
        const { data: lastRaw } = await supabase
          .from('raw_machine_data')
          .select('timestamp_utc')
          .eq('machine_id', machine.machine_id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check production event freshness
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
        const productionAge = lastProduction ? 
          Math.floor((now.getTime() - new Date(lastProduction.timestamp_utc).getTime()) / (1000 * 60)) : 
          Infinity;

        const issues: string[] = [];
        let isHealthy = true;

        // Health criteria
        if (rawDataAge > 60) {
          issues.push(`Raw data ${Math.floor(rawDataAge / 60)}h old`);
          isHealthy = false;
        }

        if (productionAge < 60 && rawDataAge > 60) {
          issues.push('Production events recent but raw data stale');
          isHealthy = false;
        }

        if (rawDataAge === Infinity && productionAge === Infinity) {
          issues.push('No data available');
          isHealthy = false;
        }

        healthResults.push({
          machineId: machine.machine_id,
          machineName: machine.name,
          isHealthy,
          lastRawDataAge: rawDataAge,
          lastProductionAge: productionAge,
          issues
        });
      }

      setPipelineHealth(healthResults);
      setLastCheck(new Date());

      // Alert on new issues
      const unhealthyMachines = healthResults.filter(h => !h.isHealthy);
      if (unhealthyMachines.length > 0) {
        console.log(`⚠️ Pipeline issues detected for ${unhealthyMachines.length} machines:`, 
          unhealthyMachines.map(m => m.machineId));
      }

    } catch (error) {
      console.error('💥 Error checking pipeline health:', error);
    }
  }, []);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    console.log('🏁 Starting pipeline health monitoring');
    setIsMonitoring(true);
    
    // Initial check
    checkPipelineHealth();
    
    // Check every 5 minutes
    const interval = setInterval(checkPipelineHealth, 5 * 60 * 1000);
    
    return () => {
      console.log('🛑 Stopping pipeline health monitoring');
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [isMonitoring, checkPipelineHealth]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const getUnhealthyMachines = useCallback(() => {
    return pipelineHealth.filter(h => !h.isHealthy);
  }, [pipelineHealth]);

  const getHealthyMachines = useCallback(() => {
    return pipelineHealth.filter(h => h.isHealthy);
  }, [pipelineHealth]);

  // Auto-start monitoring on mount
  useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  return {
    pipelineHealth,
    isMonitoring,
    lastCheck,
    checkPipelineHealth,
    startMonitoring,
    stopMonitoring,
    getUnhealthyMachines,
    getHealthyMachines
  };
};
