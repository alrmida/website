
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
    console.log('🚀 [ANALYTICS HOOK] FORCED EXECUTION - Starting fetchProductionAnalytics for machine:', machineId, '- Force refresh timestamp:', Date.now());
    
    // FORCE EXECUTION - Remove early returns that might prevent service calls
    if (!machineId || typeof machineId !== 'string' || machineId.trim() === '') {
      console.log('⚠️ [ANALYTICS HOOK] Invalid machine ID, setting empty data and stopping');
      setIsLoading(false);
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
      return;
    }

    console.log('🔍 [ANALYTICS HOOK] GUARANTEED EXECUTION PATH - Machine ID valid, forcing service calls:', {
      machineId,
      type: typeof machineId,
      length: machineId.length,
      trimmed: machineId.trim()
    });

    // FORCE LOADING STATE IMMEDIATELY
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📡 [ANALYTICS HOOK] FORCING SERVICE CALLS - No conditions, just execute');
      console.log('🔄 [ANALYTICS HOOK] Calling services with machineId:', machineId);
      
      // FORCE SERVICE EXECUTION - No Promise.all, individual calls with immediate logging
      console.log('🚀 [ANALYTICS HOOK] STEP 1: FORCING fetchProductionData call...');
      const productionStartTime = Date.now();
      const productionData = await fetchProductionData(machineId);
      const productionEndTime = Date.now();
      console.log('✅ [ANALYTICS HOOK] STEP 1 COMPLETED in', (productionEndTime - productionStartTime), 'ms - Production data received:', {
        hasData: !!productionData,
        totalProduction: productionData?.totalAllTimeProduction,
        dailyPoints: productionData?.dailyProductionData?.length,
        firstDaily: productionData?.dailyProductionData?.[0]
      });
      
      console.log('🚀 [ANALYTICS HOOK] STEP 2: FORCING fetchStatusData call...');
      const statusStartTime = Date.now();
      const statusData = await fetchStatusData(machineId);
      const statusEndTime = Date.now();
      console.log('✅ [ANALYTICS HOOK] STEP 2 COMPLETED in', (statusEndTime - statusStartTime), 'ms - Status data received:', {
        hasData: !!statusData,
        dailyPoints: statusData?.statusData?.length,
        firstDaily: statusData?.statusData?.[0]
      });
      
      console.log('🎯 [ANALYTICS HOOK] BOTH SERVICES COMPLETED - Final results:', {
        productionData: {
          hasData: !!productionData,
          dailyPoints: productionData?.dailyProductionData?.length || 0,
          totalProduction: productionData?.totalAllTimeProduction || 0,
          weeklyPoints: productionData?.weeklyProductionData?.length || 0,
          monthlyPoints: productionData?.monthlyProductionData?.length || 0
        },
        statusData: {
          hasData: !!statusData,
          dailyPoints: statusData?.statusData?.length || 0,
          weeklyPoints: statusData?.weeklyStatusData?.length || 0,
          monthlyPoints: statusData?.monthlyStatusData?.length || 0
        }
      });

      // FORCE DATA COMBINATION - No validation that might prevent data setting
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

      console.log('✅ [ANALYTICS HOOK] FORCING DATA SET with total production:', combinedData.totalAllTimeProduction);
      console.log('📊 [ANALYTICS HOOK] COMPLETE DATA SUMMARY:', {
        totalProduction: combinedData.totalAllTimeProduction,
        dailyCount: combinedData.dailyProductionData.length,
        weeklyCount: combinedData.weeklyProductionData.length,
        monthlyCount: combinedData.monthlyProductionData.length,
        hasAnyData: combinedData.totalAllTimeProduction > 0 || combinedData.dailyProductionData.length > 0
      });
      
      setData(combinedData);
      setError(null);

    } catch (err) {
      console.error('❌ [ANALYTICS HOOK] ERROR in forced execution for machine', machineId, ':', err);
      console.error('❌ [ANALYTICS HOOK] Full error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
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
      console.log('🏁 [ANALYTICS HOOK] EXECUTION COMPLETE - Setting loading to false');
      setIsLoading(false);
    }
  }, [machineId]);

  // FORCE IMMEDIATE EXECUTION when machineId changes - NO DEPENDENCIES
  useEffect(() => {
    console.log('🔄 [ANALYTICS HOOK] FORCED TRIGGER - Machine ID changed:', {
      newId: machineId,
      timestamp: Date.now()
    });
    
    if (machineId) {
      console.log('🎯 [ANALYTICS HOOK] IMMEDIATE FORCED EXECUTION starting...');
      // Force immediate execution without waiting for anything
      const executeImmediately = async () => {
        try {
          await fetchProductionAnalytics();
          console.log('✅ [ANALYTICS HOOK] IMMEDIATE EXECUTION completed successfully');
        } catch (err) {
          console.error('❌ [ANALYTICS HOOK] IMMEDIATE EXECUTION failed:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      };
      
      executeImmediately();
    } else {
      console.log('🛑 [ANALYTICS HOOK] No machine ID, setting loading to false');
      setIsLoading(false);
    }
  }, [machineId]); // ONLY machineId dependency - NO function dependencies

  // Set up automatic polling every 30 seconds (faster for real-time updates)
  useEffect(() => {
    if (!machineId) {
      console.log('🛑 [ANALYTICS HOOK] No machine ID, skipping polling setup');
      return;
    }

    console.log('🔄 [ANALYTICS HOOK] Setting up FAST production analytics polling (30s) for machine:', machineId);
    
    const interval = setInterval(() => {
      console.log('🔄 [ANALYTICS HOOK] Auto-refreshing production analytics data for machine:', machineId);
      fetchProductionAnalytics().catch(err => {
        console.error('❌ [ANALYTICS HOOK] Error in polling fetch:', err);
      });
    }, 30 * 1000); // 30 seconds for faster updates

    return () => {
      console.log('🛑 [ANALYTICS HOOK] Cleaning up production analytics polling for machine:', machineId);
      clearInterval(interval);
    };
  }, [machineId]); // ONLY machineId dependency - remove function reference

  return { data, isLoading, error, refetch: fetchProductionAnalytics };
};
