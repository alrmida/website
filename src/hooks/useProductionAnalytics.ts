
import { useState, useEffect, useCallback } from 'react';
import { ProductionAnalyticsData } from '@/types/productionAnalytics';
import { fetchProductionData } from '@/services/productionDataService';
import { fetchStatusData } from '@/services/statusDataService';

export const useProductionAnalytics = (machineId?: string) => {
  console.log('🚀 [ANALYTICS HOOK] Hook called with machineId:', { machineId, type: typeof machineId });
  
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductionAnalytics = useCallback(async () => {
    console.log('🚀 [ANALYTICS HOOK] Starting fetchProductionAnalytics for machine:', machineId, '- Force refresh timestamp:', Date.now());
    
    if (!machineId) {
      console.log('⚠️ [ANALYTICS HOOK] No machine ID provided, skipping fetch');
      setIsLoading(false);
      return;
    }

    // Validate machine ID format
    if (typeof machineId !== 'string' || machineId.trim() === '') {
      console.error('❌ [ANALYTICS HOOK] Invalid machine ID format:', machineId);
      setError('Invalid machine ID format');
      setIsLoading(false);
      return;
    }

    console.log('🔍 [ANALYTICS HOOK] Machine ID validation passed, starting fetch immediately:', {
      machineId,
      type: typeof machineId,
      length: machineId.length,
      trimmed: machineId.trim()
    });

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📡 [ANALYTICS HOOK] About to call fetchProductionData service...');
      console.log('🔄 [ANALYTICS HOOK] Calling fetchProductionData with machineId:', machineId);
      
      const [productionData, statusData] = await Promise.all([
        fetchProductionData(machineId),
        fetchStatusData(machineId)
      ]);
      
      console.log('🎯 [ANALYTICS HOOK] Services completed with results:', {
        productionData: {
          hasData: !!productionData,
          dailyPoints: productionData?.dailyProductionData?.length || 0,
          totalProduction: productionData?.totalAllTimeProduction || 0
        },
        statusData: {
          hasData: !!statusData,
          dailyPoints: statusData?.statusData?.length || 0
        }
      });

      // Validate the received data structure
      if (!productionData || !statusData) {
        throw new Error('Invalid data structure received from services');
      }

      const combinedData = {
        ...productionData,
        ...statusData
      };

      console.log('✅ [ANALYTICS HOOK] Setting combined data with total production:', combinedData.totalAllTimeProduction);
      setData(combinedData);
      setError(null);

    } catch (err) {
      console.error('❌ [ANALYTICS HOOK] Error fetching production analytics for machine', machineId, ':', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Set fallback empty data to prevent UI errors
      setData({
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
    } finally {
      setIsLoading(false);
    }
  }, [machineId]);

  // Initial fetch when machineId changes
  useEffect(() => {
    console.log('🔄 [ANALYTICS HOOK] Machine ID changed, triggering immediate fetch:', {
      newId: machineId,
      timestamp: Date.now()
    });
    
    if (machineId) {
      console.log('🎯 [ANALYTICS HOOK] Calling fetchProductionAnalytics immediately...');
      fetchProductionAnalytics().catch(err => {
        console.error('❌ [ANALYTICS HOOK] Error in initial fetch:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      });
    } else {
      console.log('🛑 [ANALYTICS HOOK] No machine ID, setting loading to false');
      setIsLoading(false);
    }
  }, [machineId, fetchProductionAnalytics]); // Include fetchProductionAnalytics in dependencies

  // Set up automatic polling every 2 minutes
  useEffect(() => {
    if (!machineId) {
      console.log('🛑 [ANALYTICS HOOK] No machine ID, skipping polling setup');
      return;
    }

    console.log('🔄 [ANALYTICS HOOK] Setting up production analytics polling for machine:', machineId);
    
    const interval = setInterval(() => {
      console.log('🔄 [ANALYTICS HOOK] Auto-refreshing production analytics data for machine:', machineId);
      fetchProductionAnalytics().catch(err => {
        console.error('❌ [ANALYTICS HOOK] Error in polling fetch:', err);
      });
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      console.log('🛑 [ANALYTICS HOOK] Cleaning up production analytics polling for machine:', machineId);
      clearInterval(interval);
    };
  }, [machineId, fetchProductionAnalytics]); // Include fetchProductionAnalytics in dependencies

  return { data, isLoading, error, refetch: fetchProductionAnalytics };
};
