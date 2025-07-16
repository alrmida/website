
import { useState, useEffect } from 'react';
import { ProductionAnalyticsData } from '@/types/productionAnalytics';
import { fetchProductionData } from '@/services/productionDataService';
import { fetchStatusData } from '@/services/statusDataService';

export const useProductionAnalytics = (machineId?: string) => {
  const [data, setData] = useState<ProductionAnalyticsData>({
    dailyProductionData: [],
    monthlyProductionData: [],
    statusData: [],
    monthlyStatusData: [],
    totalAllTimeProduction: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductionAnalytics = async () => {
    if (!machineId) {
      setIsLoading(false);
      return;
    }

    try {
      const [productionData, statusData] = await Promise.all([
        fetchProductionData(machineId),
        fetchStatusData(machineId)
      ]);

      setData({
        ...productionData,
        ...statusData
      });

      setError(null);
    } catch (err) {
      console.error('❌ Error fetching production analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch when machineId changes
  useEffect(() => {
    fetchProductionAnalytics();
  }, [machineId]);

  // Set up automatic polling every 2 minutes
  useEffect(() => {
    if (!machineId) return;

    console.log('🔄 Setting up production analytics polling for machine:', machineId);
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing production analytics data...');
      fetchProductionAnalytics();
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      console.log('🛑 Cleaning up production analytics polling');
      clearInterval(interval);
    };
  }, [machineId]);

  return { data, isLoading, error, refetch: fetchProductionAnalytics };
};
