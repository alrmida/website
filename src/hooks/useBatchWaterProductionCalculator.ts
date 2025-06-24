
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface ProductionData {
  totalProduced: number;
  currentProductionRate: number;
  pumpCycles: number;
  averageProductionPerCycle: number;
  lastPumpEvent: Date | null;
  lastCalculationTime: Date | null;
}

const INITIAL_PRODUCTION_DATA: ProductionData = {
  totalProduced: 0,
  currentProductionRate: 0,
  pumpCycles: 0,
  averageProductionPerCycle: 0,
  lastPumpEvent: null,
  lastCalculationTime: null,
};

// Updated to 1 hour for better detection of collector_ls1 state changes
const BATCH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const PRODUCTION_PER_CYCLE = 0.5; // Liters per pump cycle

export const useBatchWaterProductionCalculator = () => {
  const { user } = useAuth();
  const [productionData, setProductionData] = useState<ProductionData>(INITIAL_PRODUCTION_DATA);
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateWaterProduction = useCallback(async () => {
    console.log('🔄 Starting water production calculation (1-hour window)...');
    setIsProcessing(true);

    try {
      // Get the calculation period (1 hour)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - BATCH_INTERVAL);
      
      console.log(`📊 Fetching data from ${startTime.toISOString()} to ${endTime.toISOString()}`);

      // Fetch raw machine data for the last hour
      const { data: rawData, error } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', 'KU001619000079')
        .gte('timestamp_utc', startTime.toISOString())
        .lte('timestamp_utc', endTime.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (error) {
        console.error('❌ Error fetching raw data:', error);
        return;
      }

      if (!rawData || rawData.length === 0) {
        console.log('⚠️ No data found for the 1-hour period');
        return;
      }

      console.log(`📈 Found ${rawData.length} data points in 1-hour window`);

      // Enhanced logging for collector_ls1 analysis
      const ls1Values = rawData.map(d => d.collector_ls1).filter(v => v !== null);
      const uniqueLS1Values = [...new Set(ls1Values)];
      const ls1Distribution = uniqueLS1Values.map(val => ({
        value: val,
        count: ls1Values.filter(v => v === val).length,
        percentage: Math.round((ls1Values.filter(v => v === val).length / ls1Values.length) * 100)
      }));

      console.log('📊 Collector LS1 distribution over 1 hour:', ls1Distribution);

      // Detect pump cycles using collector_ls1 transitions (1→0 indicates pump start)
      let pumpCycles = 0;
      let lastPumpEvent: Date | null = null;

      for (let i = 1; i < rawData.length; i++) {
        const prev = rawData[i - 1];
        const curr = rawData[i];

        // Check for 1→0 transition in collector_ls1 (pump activation)
        if (prev.collector_ls1 === 1 && curr.collector_ls1 === 0) {
          pumpCycles++;
          lastPumpEvent = new Date(curr.timestamp_utc);
          console.log(`🔄 Pump cycle ${pumpCycles} detected at ${curr.timestamp_utc}`);
        }
      }

      console.log(`⚡ Total pump cycles detected in 1 hour: ${pumpCycles}`);

      // If no pump cycles detected, log this for debugging
      if (pumpCycles === 0) {
        console.log('⚠️ No collector_ls1 transitions detected in 1-hour window');
        console.log('💡 This might indicate: (1) No pump activity, (2) Consistent LS1 state, or (3) Missing data');
        
        // Log water level patterns as additional context
        const waterLevels = rawData.map(d => d.water_level_l).filter(v => v !== null);
        if (waterLevels.length > 0) {
          const minLevel = Math.min(...waterLevels);
          const maxLevel = Math.max(...waterLevels);
          console.log(`💧 Water level range: ${minLevel.toFixed(2)}L - ${maxLevel.toFixed(2)}L`);
        }
      }

      // Calculate production metrics
      const totalWaterProduced = pumpCycles * PRODUCTION_PER_CYCLE;
      const averageProductionPerCycle = pumpCycles > 0 ? PRODUCTION_PER_CYCLE : 0;
      const productionRatePerHour = totalWaterProduced; // Already in L/h since we're using 1-hour window

      console.log(`📊 Production Summary (1 hour):`);
      console.log(`   • Pump cycles: ${pumpCycles}`);
      console.log(`   • Water produced: ${totalWaterProduced.toFixed(2)} L`);
      console.log(`   • Production rate: ${productionRatePerHour.toFixed(2)} L/h`);
      console.log(`   • Avg per cycle: ${averageProductionPerCycle.toFixed(2)} L`);

      // Store metrics in database
      const { error: insertError } = await supabase
        .from('water_production_metrics')
        .insert({
          machine_id: 'KU001619000079',
          calculation_period_start: startTime.toISOString(),
          calculation_period_end: endTime.toISOString(),
          total_water_produced: totalWaterProduced,
          pump_cycles_count: pumpCycles,
          average_production_per_cycle: averageProductionPerCycle,
          production_rate_lh: productionRatePerHour,
          last_pump_event: lastPumpEvent?.toISOString() || null,
        });

      if (insertError) {
        console.error('❌ Error storing production metrics:', insertError);
      } else {
        console.log('✅ Production metrics stored successfully');
      }

      // Update local state
      setProductionData({
        totalProduced: totalWaterProduced,
        currentProductionRate: productionRatePerHour,
        pumpCycles,
        averageProductionPerCycle,
        lastPumpEvent,
        lastCalculationTime: new Date(),
      });

    } catch (error) {
      console.error('❌ Error in water production calculation:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetMachineMetrics = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to reset metrics",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('reset_machine_metrics', {
        p_machine_id: 'KU001619000079',
        p_admin_user_id: user.id
      });

      if (error) {
        console.error('Error resetting metrics:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ Machine metrics reset successfully');
        toast({
          title: "Success",
          description: "Machine metrics have been reset",
        });
        
        // Reset local state
        setProductionData(INITIAL_PRODUCTION_DATA);
      }
    } catch (error) {
      console.error('Error resetting metrics:', error);
      toast({
        title: "Error",
        description: "Failed to reset metrics",
        variant: "destructive",
      });
    }
  };

  // Auto-process every hour
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Auto-processing batch data (1-hour interval)');
      calculateWaterProduction();
    }, BATCH_INTERVAL);

    // Initial calculation
    calculateWaterProduction();

    return () => clearInterval(interval);
  }, [calculateWaterProduction]);

  return {
    productionData,
    isProcessing,
    processBatchData: calculateWaterProduction,
    resetMachineMetrics,
  };
};
