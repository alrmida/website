import { useState, useEffect, useCallback } from 'react';
import { fetchProductionData } from '@/services/productionDataService';
import { fetchStatusData } from '@/services/statusDataService';
import { ProductionAnalyticsData } from '@/types/productionAnalytics';

/**
 * Direct service hook - bypasses all other hooks and calls services directly
 * This is a guaranteed fallback to ensure production data is always fetched
 */
export const useDirectProductionService = (machineId?: string) => {
  console.log('🚀 [DIRECT SERVICE] Hook called with machineId:', machineId);
  
  const [data, setData] = useState<ProductionAnalyticsData>({
    dailyProductionData: [],
    weeklyProductionData: [],
    monthlyProductionData: [],
    yearlyProductionData: [],
    statusData: [],
    weeklyStatusData: [],
    monthlyStatusData: [],
    yearlyStatusData: [],
    totalAllTimeProduction: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const directFetch = useCallback(async () => {
    if (!machineId) {
      console.log('⚠️ [DIRECT SERVICE] No machine ID, skipping');
      return;
    }

    console.log('🚀 [DIRECT SERVICE] DIRECT EXECUTION - Bypassing all other hooks');
    setIsLoading(true);
    setError(null);

    try {
      console.log('📡 [DIRECT SERVICE] Calling fetchProductionData directly...');
      const productionData = await fetchProductionData(machineId);
      console.log('✅ [DIRECT SERVICE] Production data received:', {
        totalProduction: productionData?.totalAllTimeProduction,
        dailyPoints: productionData?.dailyProductionData?.length
      });

      console.log('📡 [DIRECT SERVICE] Calling fetchStatusData directly...');
      const statusData = await fetchStatusData(machineId);
      console.log('✅ [DIRECT SERVICE] Status data received:', {
        dailyPoints: statusData?.statusData?.length
      });

      const combinedData = {
        dailyProductionData: productionData?.dailyProductionData || [],
        weeklyProductionData: productionData?.weeklyProductionData || [],
        monthlyProductionData: productionData?.monthlyProductionData || [],
        yearlyProductionData: productionData?.yearlyProductionData || [],
        statusData: statusData?.statusData || [],
        weeklyStatusData: statusData?.weeklyStatusData || [],
        monthlyStatusData: statusData?.monthlyStatusData || [],
        yearlyStatusData: statusData?.yearlyStatusData || [],
        totalAllTimeProduction: productionData?.totalAllTimeProduction || 0
      };

      console.log('✅ [DIRECT SERVICE] Setting combined data:', {
        totalProduction: combinedData.totalAllTimeProduction,
        hasData: combinedData.totalAllTimeProduction > 0
      });

      setData(combinedData);

    } catch (err) {
      console.error('❌ [DIRECT SERVICE] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [machineId]);

  // Execute immediately when machine ID changes
  useEffect(() => {
    if (machineId) {
      console.log('🔄 [DIRECT SERVICE] Machine ID changed, executing directly');
      directFetch();
    }
  }, [machineId, directFetch]);

  return { data, isLoading, error, directFetch };
};