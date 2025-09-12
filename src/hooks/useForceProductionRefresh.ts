import { useState, useCallback } from 'react';
import { fetchProductionData } from '@/services/productionDataService';
import { fetchStatusData } from '@/services/statusDataService';

/**
 * Emergency production refresh hook - Forces immediate execution
 */
export const useForceProductionRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const forceRefresh = useCallback(async (machineId: string) => {
    console.log('🚨 [FORCE REFRESH] EMERGENCY REFRESH INITIATED for:', machineId);
    setIsRefreshing(true);

    try {
      console.log('🚨 [FORCE REFRESH] DIRECTLY calling fetchProductionData...');
      const productionResult = await fetchProductionData(machineId);
      console.log('🚨 [FORCE REFRESH] Production result:', {
        totalProduction: productionResult?.totalAllTimeProduction,
        dailyPoints: productionResult?.dailyProductionData?.length
      });

      console.log('🚨 [FORCE REFRESH] DIRECTLY calling fetchStatusData...');
      const statusResult = await fetchStatusData(machineId);
      console.log('🚨 [FORCE REFRESH] Status result:', {
        dailyPoints: statusResult?.statusData?.length
      });

      setLastRefresh(new Date().toISOString());
      return {
        productionData: productionResult,
        statusData: statusResult
      };

    } catch (error) {
      console.error('🚨 [FORCE REFRESH] ERROR:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return { forceRefresh, isRefreshing, lastRefresh };
};