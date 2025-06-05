
import { useMemo } from 'react';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { getStaticProductionData, getStaticStatusData } from '@/utils/staticDataGenerator';

interface Machine {
  id: number;
  machine_id: string;
  name: string;
  location: string;
  client_id: string;
  profiles?: {
    username: string;
  };
}

// Helper function to get model name based on machine ID
const getModelName = (machineId: string): string => {
  if (machineId === 'KU079') return 'Amphore'; // Live data machine
  if (machineId.startsWith('KU0')) return 'Amphore';
  if (machineId.startsWith('KU1')) return 'BoKs';
  if (machineId.startsWith('KU2')) return 'Dispenser';
  return 'Amphore'; // Default to Amphore
};

export const useDashboardData = (selectedMachine: Machine | null) => {
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

    // Current machine info based on selection - use live/static data when machine is selected
    const machineInfo = selectedMachine ? {
      machineId: selectedMachine.machine_id,
      machineName: selectedMachine.name,
      location: selectedMachine.location,
      status: liveData.status || 'Loading...',
      modelName: getModelName(selectedMachine.machine_id),
      isOnline: liveData.isOnline
    } : defaultMachineInfo;

    // Water tank specifications - use live/static data when machine is selected
    const waterTank = {
      currentLevel: selectedMachine ? liveData.waterLevel : 0,
      maxCapacity: 10.0,
      percentage: selectedMachine ? Math.round((liveData.waterLevel / 10.0) * 100) : 0
    };

    // Get production data based on machine - varied for different machines
    const productionMultiplier = selectedMachine ? 
      (selectedMachine.machine_id === 'KU079' ? 1.0 : 
       selectedMachine.machine_id === 'KU001' ? 1.3 :
       selectedMachine.machine_id === 'KU002' ? 0.8 :
       selectedMachine.machine_id === 'KU003' ? 0.6 :
       selectedMachine.machine_id === 'KU004' ? 0.4 : 0.9) : 0;

    const productionData = getStaticProductionData(selectedMachine?.machine_id, productionMultiplier);

    const dailyProductionData = selectedMachine ? productionData.daily : 
      [{ date: '28 May', production: 0 }, { date: '29 May', production: 0 }, { date: '30 May', production: 0 }, { date: '31 May', production: 0 }];

    const monthlyProductionData = selectedMachine ? productionData.monthly :
      [{ month: 'Mar 2025', production: 0 }, { month: 'Apr 2025', production: 0 }, { month: 'May 2025', production: 0 }];

    // Status data for last 7 days - varied based on machine
    const statusData = selectedMachine ? getStaticStatusData(selectedMachine.machine_id) : [
      { date: '25 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '26 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '27 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '28 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '29 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '30 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { date: '31 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 }
    ];

    // Monthly status data (last 3 months) - varied based on machine
    const monthlyStatusMultiplier = selectedMachine ? 
      (selectedMachine.machine_id === 'KU004' ? 0.3 : 
       selectedMachine.machine_id === 'KU003' ? 0.7 :
       selectedMachine.machine_id === 'KU002' ? 0.9 : 1.0) : 0;

    const monthlyStatusData = selectedMachine ? [
      { month: '2025-03', producing: 68.9 * monthlyStatusMultiplier, idle: 14.1, fullWater: 5.2, disconnected: 11.8 },
      { month: '2025-04', producing: 85.2 * monthlyStatusMultiplier, idle: 8.5, fullWater: 3.1, disconnected: 3.2 },
      { month: '2025-05', producing: 72.4 * monthlyStatusMultiplier, idle: 15.6, fullWater: 6.8, disconnected: 5.2 }
    ] : [
      { month: '2025-03', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { month: '2025-04', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
      { month: '2025-05', producing: 0, idle: 0, fullWater: 0, disconnected: 0 }
    ];

    // Calculate total water produced for ESG metrics
    const totalWaterProduced = selectedMachine ? 1245.7 : 0;

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
