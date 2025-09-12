
import { useMemo } from 'react';
import useLiveMachineData from '@/hooks/useLiveMachineData';
import { useDirectProductionData } from '@/hooks/useDirectProductionData';
import { MachineWithClient, getDisplayModelName } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';
import { getStaticProductionData, getStaticStatusData, getStaticMonthlyStatusData } from '@/utils/staticDataGenerator';

export const useDashboardData = (selectedMachine: MachineWithClient | null) => {
  const { user } = useAuth();
  
  // Fetch live/static machine data based on selected machine
  const { data: liveData, isLoading: liveDataLoading, error: liveDataError } = useLiveMachineData(selectedMachine);
  
  // Fetch real production data directly from database
  console.log('🎯 [DASHBOARD DATA] About to call useDirectProductionData with machineId:', selectedMachine?.machine_id);
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useDirectProductionData(selectedMachine?.machine_id);

  const dashboardData = useMemo(() => {
    console.log('🔄 Updating dashboard data for machine:', selectedMachine?.machine_id);
    console.log('📊 Analytics data:', analyticsData);
    console.log('🎯 Total all-time production:', analyticsData?.totalAllTimeProduction || 'no data');

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
      status: liveData?.status || 'Loading...',
      modelName: getDisplayModelName(selectedMachine),
      isOnline: liveData?.isOnline || false
    } : defaultMachineInfo;

    // Water tank specifications - use live data when machine is selected
    const waterTank = {
      currentLevel: selectedMachine ? (liveData?.waterLevel || 0) : 0,
      maxCapacity: 10.0,
      percentage: selectedMachine ? Math.round(((liveData?.waterLevel || 0) / 10.0) * 100) : 0
    };

    // Always use real data from database when machine is selected
    const dailyProductionData = selectedMachine && analyticsData.dailyProductionData.length > 0 
      ? analyticsData.dailyProductionData 
      : [];

    const monthlyProductionData = selectedMachine && analyticsData.monthlyProductionData.length > 0 
      ? analyticsData.monthlyProductionData 
      : [];

    // Always use real status data from database when machine is selected
    const statusData = selectedMachine && analyticsData.statusData.length > 0 
      ? analyticsData.statusData 
      : [];

    const monthlyStatusData = selectedMachine && analyticsData.monthlyStatusData.length > 0 
      ? analyticsData.monthlyStatusData 
      : [];

    // Use real total water produced from database
    const totalWaterProduced = selectedMachine ? analyticsData.totalAllTimeProduction : 0;

    console.log('📊 Final dashboard data:');
    console.log('- Total water produced (all-time):', totalWaterProduced);
    console.log('- Daily production points:', dailyProductionData.length);

    return {
      machineInfo,
      waterTank,
      dailyProductionData,
      monthlyProductionData,
      statusData,
      monthlyStatusData,
      totalWaterProduced,
      liveData: liveData || { status: 'Loading...', isOnline: false, waterLevel: 0, lastUpdated: new Date(), compressorOn: false }
    };
  }, [selectedMachine, liveData, analyticsData, user?.email]);

  return {
    ...dashboardData,
    dataLoading: liveDataLoading || analyticsLoading,
    dataError: liveDataError || analyticsError,
    analyticsData,
    analyticsLoading,
    analyticsError
  };
};
