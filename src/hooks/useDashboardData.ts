
import { useMemo } from 'react';
import useLiveMachineData from '@/hooks/useLiveMachineData';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { MachineWithClient, getDisplayModelName } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';
import { getStaticProductionData, getStaticStatusData, getStaticMonthlyStatusData } from '@/utils/staticDataGenerator';

export const useDashboardData = (selectedMachine: MachineWithClient | null) => {
  const { user } = useAuth();
  
  // Fetch live/static machine data based on selected machine
  const { data: liveData, isLoading: liveDataLoading, error: liveDataError } = useLiveMachineData(selectedMachine);
  
  // Fetch real production analytics data
  console.log('🎯 [DASHBOARD DATA] About to call useProductionAnalytics with machineId:', selectedMachine?.machine_id);
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useProductionAnalytics(selectedMachine?.machine_id);

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

    // Use real analytics data when available, otherwise use static data
    const hasRealData = selectedMachine && analyticsData && analyticsData.totalAllTimeProduction > 0;
    
    const dailyProductionData = hasRealData && analyticsData.dailyProductionData.length > 0 
      ? analyticsData.dailyProductionData 
      : getStaticProductionData(selectedMachine?.machine_id).daily;

    const weeklyProductionData = hasRealData && analyticsData.weeklyProductionData.length > 0 
      ? analyticsData.weeklyProductionData 
      : [];

    const monthlyProductionData = hasRealData && analyticsData.monthlyProductionData.length > 0 
      ? analyticsData.monthlyProductionData 
      : getStaticProductionData(selectedMachine?.machine_id).monthly;

    const yearlyProductionData = hasRealData && analyticsData.yearlyProductionData.length > 0 
      ? analyticsData.yearlyProductionData 
      : [];

    // Use real status data when available, otherwise use static data
    const statusData = hasRealData && analyticsData.statusData.length > 0 
      ? analyticsData.statusData 
      : getStaticStatusData(selectedMachine?.machine_id);

    const weeklyStatusData = hasRealData && analyticsData.weeklyStatusData.length > 0 
      ? analyticsData.weeklyStatusData 
      : [];

    const monthlyStatusData = hasRealData && analyticsData.monthlyStatusData.length > 0 
      ? analyticsData.monthlyStatusData 
      : getStaticMonthlyStatusData(selectedMachine?.machine_id);

    const yearlyStatusData = hasRealData && analyticsData.yearlyStatusData.length > 0 
      ? analyticsData.yearlyStatusData 
      : [];

    // Calculate total water produced using ALL-TIME data from analytics
    const totalWaterProduced = selectedMachine && analyticsData?.totalAllTimeProduction !== undefined
      ? analyticsData.totalAllTimeProduction
      : 0;

    console.log('📊 Final dashboard data:');
    console.log('- Total water produced (all-time):', totalWaterProduced);
    console.log('- Using real data:', hasRealData);
    console.log('- Daily production points:', dailyProductionData.length);

    return {
      machineInfo,
      waterTank,
      dailyProductionData,
      weeklyProductionData,
      monthlyProductionData,
      yearlyProductionData,
      statusData,
      weeklyStatusData,
      monthlyStatusData,
      yearlyStatusData,
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
