
import { useMemo } from 'react';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { getStaticProductionData, getStaticStatusData } from '@/utils/staticDataGenerator';
import { MachineWithClient, getDisplayModelName } from '@/types/machine';

export const useDashboardData = (selectedMachine: MachineWithClient | null) => {
  // Fetch live/static machine data based on selected machine
  const { data: liveData, isLoading: dataLoading, error: dataError } = useLiveMachineData(selectedMachine?.machine_id);

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

    // Get production data - use static data for all machines
    const productionData = getStaticProductionData(selectedMachine?.machine_id, 1.0);

    const dailyProductionData = selectedMachine ? productionData.daily : 
      [{ date: '28 May', production: 0 }, { date: '29 May', production: 0 }, { date: '30 May', production: 0 }, { date: '31 May', production: 0 }];

    const monthlyProductionData = selectedMachine ? productionData.monthly :
      [{ month: 'Mar 2025', production: 0 }, { month: 'Apr 2025', production: 0 }, { month: 'May 2025', production: 0 }];

    // Status data for last 7 days
    const statusData = selectedMachine ? getStaticStatusData(selectedMachine.machine_id) : [
      { date: '25 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '26 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '27 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '28 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '29 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '30 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '31 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 }
    ];

    // Monthly status data (last 3 months) - clear for real machine
    const isRealMachine = selectedMachine?.machine_id === 'KU001619000079';
    const monthlyStatusData = isRealMachine ? [
      { month: '2025-03', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { month: '2025-04', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { month: '2025-05', producing: 0, idle: 0, fullWater: 0, disconnected: 0 }
    ] : [
      { month: '2025-03', producing: 68.9, idle: 14.1, fullWater: 5.2, disconnected: 11.8 },
      { month: '2025-04', producing: 85.2, idle: 8.5, fullWater: 3.1, disconnected: 3.2 },
      { month: '2025-05', producing: 72.4, idle: 15.6, fullWater: 6.8, disconnected: 5.2 }
    ];

    // Calculate total water produced - clear for real machine to use live calculations
    const totalWaterProduced = isRealMachine ? 0 : 1245.7;

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
  }, [selectedMachine, liveData]);

  return {
    ...dashboardData,
    dataLoading,
    dataError
  };
};
