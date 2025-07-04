
import { useMemo } from 'react';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { MachineWithClient, getDisplayModelName } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';

export const useDashboardData = (selectedMachine: MachineWithClient | null) => {
  const { user } = useAuth();
  // Fetch live/static machine data based on selected machine
  const { data: liveData, isLoading: dataLoading, error: dataError } = useLiveMachineData(selectedMachine?.machine_id);
  
  // Fetch real production analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useProductionAnalytics(selectedMachine?.machine_id);

  const dashboardData = useMemo(() => {
    // Default machine info for when no machine is selected
    const defaultMachineInfo = {
      machineId: 'Select a machine',
      machineName: 'No machine selected',
      location: 'N/A',
      status: 'Offline',
      modelName: 'N/A',
      isOnline: false
    };

    // Current machine info based on selection - use live data when machine is selected
    const machineInfo = selectedMachine ? {
      machineId: selectedMachine.machine_id,
      machineName: selectedMachine.name,
      location: selectedMachine.location || 'N/A',
      status: liveData.status || 'Loading...',
      modelName: getDisplayModelName(selectedMachine),
      isOnline: liveData.isOnline
    } : defaultMachineInfo;

    // Water tank specifications - use live data when machine is selected
    const waterTank = {
      currentLevel: selectedMachine ? liveData.waterLevel : 0,
      maxCapacity: 10.0,
      percentage: selectedMachine ? Math.round((liveData.waterLevel / 10.0) * 100) : 0
    };

    // Use real analytics data when available
    const dailyProductionData = selectedMachine && analyticsData.dailyProductionData.length > 0 
      ? analyticsData.dailyProductionData 
      : Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            production: 0
          };
        });

    const monthlyProductionData = selectedMachine && analyticsData.monthlyProductionData.length > 0 
      ? analyticsData.monthlyProductionData 
      : Array.from({ length: 3 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (2 - i));
          return {
            month: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
            production: 0
          };
        });

    // Use real status data when available
    const statusData = selectedMachine && analyticsData.statusData.length > 0 
      ? analyticsData.statusData 
      : Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            producing: 0,
            idle: 0,
            fullWater: 0,
            disconnected: 0
          };
        });

    // Use real monthly status data when available
    const monthlyStatusData = selectedMachine && analyticsData.monthlyStatusData.length > 0 
      ? analyticsData.monthlyStatusData 
      : Array.from({ length: 3 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (2 - i));
          return {
            month: date.getMonth() < 10 ? `${date.getFullYear()}-0${date.getMonth() + 1}` : `${date.getFullYear()}-${date.getMonth() + 1}`,
            producing: 0,
            idle: 0,
            fullWater: 0,
            disconnected: 0
          };
        });

    // Calculate total water produced from real production data only (no drainage events)
    // Use the same calculation as the analytics to ensure consistency
    const totalWaterProduced = selectedMachine && analyticsData.dailyProductionData.length > 0 
      ? analyticsData.dailyProductionData.reduce((sum, day) => sum + day.production, 0)
      : 0;

    console.log('📊 Dashboard total water produced:', totalWaterProduced);

    return {
      machineInfo,
      waterTank,
      dailyProductionData,
      monthlyProductionData,
      statusData,
      monthlyStatusData,
      totalWaterProduced,
      liveData
    };
  }, [selectedMachine, liveData, analyticsData, user?.email]);

  return {
    ...dashboardData,
    dataLoading: dataLoading || analyticsLoading,
    dataError
  };
};
