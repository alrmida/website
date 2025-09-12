
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
    
    console.log('🔍 [ANALYTICS HOOK] About to call fetchProductionData service...');
    console.log('📦 [ANALYTICS HOOK] fetchProductionData function:', typeof fetchProductionData);

    // Validate machine ID format
    if (typeof machineId !== 'string' || machineId.trim() === '') {
      console.error('❌ [ANALYTICS HOOK] Invalid machine ID format:', machineId);
      setError('Invalid machine ID format');
      setIsLoading(false);
      return;
    }

    console.log('🔍 [ANALYTICS HOOK] Machine ID validation passed:', {
      machineId,
      type: typeof machineId,
      length: machineId.length,
      trimmed: machineId.trim()
    });

    try {
      console.log('📡 [ANALYTICS HOOK] Fetching production and status data...');
      console.log('🔄 [ANALYTICS HOOK] Calling fetchProductionData with machineId:', machineId);
      
      const productionDataPromise = fetchProductionData(machineId);
      console.log('🔄 [ANALYTICS HOOK] fetchProductionData call initiated, awaiting result...');
      
      const [productionData, statusData] = await Promise.all([
        productionDataPromise,
        fetchStatusData(machineId)
      ]);
      
      console.log('🎯 [ANALYTICS HOOK] fetchProductionData completed with result:', {
        hasData: !!productionData,
        type: typeof productionData,
        keys: productionData ? Object.keys(productionData) : 'no data'
      });

      console.log('📊 [ANALYTICS HOOK] Data fetch results:', {
        machineId,
        productionData: {
          dailyPoints: productionData.dailyProductionData?.length || 0,
          weeklyPoints: productionData.weeklyProductionData?.length || 0,
          monthlyPoints: productionData.monthlyProductionData?.length || 0,
          yearlyPoints: productionData.yearlyProductionData?.length || 0,
          totalProduction: productionData.totalAllTimeProduction
        },
        statusData: {
          dailyPoints: statusData.statusData?.length || 0,
          weeklyPoints: statusData.weeklyStatusData?.length || 0,
          monthlyPoints: statusData.monthlyStatusData?.length || 0,
          yearlyPoints: statusData.yearlyStatusData?.length || 0,
          sampleDaily: statusData.statusData?.[0] || 'No data'
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

      console.log('📈 [ANALYTICS HOOK] Combined analytics data summary:', {
        machineId,
        totalDataPoints: {
          daily: combinedData.dailyProductionData?.length || 0,
          weekly: combinedData.weeklyProductionData?.length || 0,
          monthly: combinedData.monthlyProductionData?.length || 0,
          yearly: combinedData.yearlyProductionData?.length || 0
        },
        statusSummary: {
          daily: combinedData.statusData?.length || 0,
          sampleStatus: combinedData.statusData?.[0] || 'No status data'
        },
        totalProduction: combinedData.totalAllTimeProduction
      });

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
    console.log('🔄 [ANALYTICS HOOK] Machine ID changed, triggering fetch:', {
      previousId: data ? 'has-data' : 'no-data',
      newId: machineId
    });
    
    if (machineId) {
      setIsLoading(true);
      fetchProductionAnalytics().catch(err => {
        console.error('❌ [ANALYTICS HOOK] Error in initial fetch:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      });
    }
  }, [machineId]); // Remove circular dependency

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
  }, [machineId]); // Remove circular dependency

  return { data, isLoading, error, refetch: fetchProductionAnalytics };
};
