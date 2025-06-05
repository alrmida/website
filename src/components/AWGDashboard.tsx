
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import MachineInfoHeader from '@/components/MachineInfoHeader';
import MetricsCards from '@/components/MetricsCards';
import ProductionAnalytics from '@/components/ProductionAnalytics';
import ESGMetrics from '@/components/ESGMetrics';
import MachineSelector from '@/components/MachineSelector';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';

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

// Generate varied static production data based on machine ID
function getStaticProductionData(machineId: string | undefined, multiplier: number = 1) {
  const baseDaily = [
    { date: '28 May', production: 15.2 },
    { date: '29 May', production: 31.5 },
    { date: '30 May', production: 47.8 },
    { date: '31 May', production: 19.6 }
  ];

  const baseMonthly = [
    { month: 'Mar 2025', production: 1850 },
    { month: 'Apr 2025', production: 2250 },
    { month: 'May 2025', production: 1950 }
  ];

  return {
    daily: baseDaily.map(item => ({ ...item, production: item.production * multiplier })),
    monthly: baseMonthly.map(item => ({ ...item, production: item.production * multiplier }))
  };
}

// Generate varied status data based on machine ID
function getStaticStatusData(machineId: string | undefined) {
  const variations: { [key: string]: any } = {
    'AWG001': { producingMultiplier: 1.2, idleMultiplier: 0.5, disconnectedMultiplier: 0.2 },
    'AWG002': { producingMultiplier: 0.9, idleMultiplier: 1.5, disconnectedMultiplier: 0.8 },
    'AWG003': { producingMultiplier: 0.7, idleMultiplier: 2.0, disconnectedMultiplier: 1.5 },
    'AWG004': { producingMultiplier: 0.3, idleMultiplier: 0.8, disconnectedMultiplier: 3.0 },
    'default': { producingMultiplier: 1.0, idleMultiplier: 1.0, disconnectedMultiplier: 1.0 }
  };

  const variation = variations[machineId || 'default'] || variations['default'];
  
  const baseStatusData = [
    { date: '25 May', producing: 19, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '26 May', producing: 18, idle: 2, fullWater: 1, disconnected: 3 },
    { date: '27 May', producing: 22, idle: 1, fullWater: 1, disconnected: 0 },
    { date: '28 May', producing: 19, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '29 May', producing: 21, idle: 1, fullWater: 1, disconnected: 1 },
    { date: '30 May', producing: 12, idle: 6, fullWater: 3, disconnected: 3 },
    { date: '31 May', producing: 10, idle: 6, fullWater: 4, disconnected: 4 }
  ];

  return baseStatusData.map(day => ({
    ...day,
    producing: Math.round(day.producing * variation.producingMultiplier),
    idle: Math.round(day.idle * variation.idleMultiplier),
    disconnected: Math.round(day.disconnected * variation.disconnectedMultiplier)
  }));
}

const AWGDashboard = () => {
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  // Fetch live/static machine data based on selected machine
  const { data: liveData, isLoading: dataLoading, error: dataError } = useLiveMachineData(selectedMachine?.machine_id);

  console.log('Live data in dashboard for machine:', selectedMachine?.machine_id, liveData);

  // Default machine info for when no machine is selected
  const defaultMachineInfo = {
    machineId: 'Select a machine',
    machineName: 'No machine selected',
    location: 'N/A',
    status: 'Offline',
    launchDate: 'N/A',
    isOnline: false
  };

  // Current machine info based on selection - use live/static data when machine is selected
  const machineInfo = selectedMachine ? {
    machineId: selectedMachine.machine_id,
    machineName: selectedMachine.name,
    location: selectedMachine.location,
    status: liveData.status || 'Loading...',
    launchDate: 'March 15, 2024',
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
    (selectedMachine.machine_id === 'ID79' ? 1.0 : 
     selectedMachine.machine_id === 'AWG001' ? 1.3 :
     selectedMachine.machine_id === 'AWG002' ? 0.8 :
     selectedMachine.machine_id === 'AWG003' ? 0.6 :
     selectedMachine.machine_id === 'AWG004' ? 0.4 : 0.9) : 0;

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
    (selectedMachine.machine_id === 'AWG004' ? 0.3 : 
     selectedMachine.machine_id === 'AWG003' ? 0.7 :
     selectedMachine.machine_id === 'AWG002' ? 0.9 : 1.0) : 0;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MachineSelector 
          onMachineSelect={setSelectedMachine}
          selectedMachine={selectedMachine}
        />

        {/* Show data error only for live data machine (KU079) */}
        {dataError && selectedMachine?.machine_id === 'KU079' && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p><strong>Live Data Connection Error:</strong> {dataError}</p>
            <p className="text-sm">Unable to fetch live data from InfluxDB. Please check the connection.</p>
          </div>
        )}

        {/* Show loading indicator only for live data */}
        {dataLoading && selectedMachine?.machine_id === 'KU079' && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
            <p>Loading live machine data...</p>
          </div>
        )}

        <MachineInfoHeader
          machineId={machineInfo.machineId}
          machineName={machineInfo.machineName}
          location={machineInfo.location}
          status={machineInfo.status}
          launchDate={machineInfo.launchDate}
          isOnline={machineInfo.isOnline}
          userRole={profile?.role}
        />

        <MetricsCards
          waterTank={waterTank}
          launchDate={machineInfo.launchDate}
          machineStatus={machineInfo.status}
        />

        <ESGMetrics totalWaterProduced={totalWaterProduced} />

        <ProductionAnalytics
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          dailyProductionData={dailyProductionData}
          monthlyProductionData={monthlyProductionData}
          statusData={statusData}
          monthlyStatusData={monthlyStatusData}
        />

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          © 2025 Kumulus Water • Last updated: {selectedMachine && liveData.lastUpdated ? new Date(liveData.lastUpdated).toLocaleString() : '2025-06-01 07:39'}
          {profile && (
            <span className="ml-4">
              Logged in as: {profile.username} ({profile.role})
            </span>
          )}
          {selectedMachine && (
            <span className="ml-4 text-xs">
              {selectedMachine.machine_id === 'KU079' ? 
                `Data age: ${Math.round(liveData.dataAge / 1000)}s • Compressor: ${liveData.compressorOn ? 'ON' : 'OFF'}` :
                'Static Demo Data'
              }
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AWGDashboard;
