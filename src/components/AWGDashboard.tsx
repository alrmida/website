import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import MachineInfoHeader from '@/components/MachineInfoHeader';
import MetricsCards from '@/components/MetricsCards';
import ProductionAnalytics from '@/components/ProductionAnalytics';
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

const AWGDashboard = () => {
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  // Fetch live machine data
  const { data: liveData, isLoading: dataLoading, error: dataError } = useLiveMachineData();

  console.log('Live data in dashboard:', liveData);

  // Default machine info for when no machine is selected
  const defaultMachineInfo = {
    machineId: 'Select a machine',
    machineName: 'No machine selected',
    location: 'N/A',
    status: 'Offline',
    launchDate: 'N/A'
  };

  // Current machine info based on selection - use live data when machine is selected
  const machineInfo = selectedMachine ? {
    machineId: selectedMachine.machine_id,
    machineName: selectedMachine.name,
    location: selectedMachine.location,
    status: liveData.status || 'Loading...',
    launchDate: 'March 15, 2024'
  } : defaultMachineInfo;

  // Water tank specifications - use live data when machine is selected
  const waterTank = {
    currentLevel: selectedMachine ? liveData.waterLevel : 0,
    maxCapacity: 12.0,
    percentage: selectedMachine ? Math.round((liveData.waterLevel / 12.0) * 100) : 0
  };

  // Extended daily production data (last 7 days)
  const dailyProductionData = [
    { date: '28 May', production: selectedMachine ? 15.2 : 0 },
    { date: '29 May', production: selectedMachine ? 31.5 : 0 },
    { date: '30 May', production: selectedMachine ? 47.8 : 0 },
    { date: '31 May', production: selectedMachine ? 19.6 : 0 }
  ];

  // Monthly production data (last 3 months)
  const monthlyProductionData = [
    { month: 'Mar 2025', production: selectedMachine ? 1850 : 0 },
    { month: 'Apr 2025', production: selectedMachine ? 2250 : 0 },
    { month: 'May 2025', production: selectedMachine ? 1950 : 0 }
  ];

  // Status data for last 7 days - Fixed to ensure all required properties
  const statusData = [
    { date: '25 May', producing: selectedMachine ? 19 : 0, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '26 May', producing: selectedMachine ? 18 : 0, idle: 2, fullWater: 1, disconnected: 3 },
    { date: '27 May', producing: selectedMachine ? 22 : 0, idle: 1, fullWater: 1, disconnected: 0 },
    { date: '28 May', producing: selectedMachine ? 19 : 0, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '29 May', producing: selectedMachine ? 21 : 0, idle: 1, fullWater: 1, disconnected: 1 },
    { date: '30 May', producing: selectedMachine ? 12 : 0, idle: 6, fullWater: 3, disconnected: 3 },
    { date: '31 May', producing: selectedMachine ? 10 : 0, idle: 6, fullWater: 4, disconnected: 4 }
  ];

  // Monthly status data (last 3 months)
  const monthlyStatusData = [
    { month: '2025-03', producing: selectedMachine ? 68.9 : 0, idle: 14.1, fullWater: 5.2, disconnected: 11.8 },
    { month: '2025-04', producing: selectedMachine ? 85.2 : 0, idle: 8.5, fullWater: 3.1, disconnected: 3.2 },
    { month: '2025-05', producing: selectedMachine ? 72.4 : 0, idle: 15.6, fullWater: 6.8, disconnected: 5.2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MachineSelector 
          onMachineSelect={setSelectedMachine}
          selectedMachine={selectedMachine}
        />

        {/* Show data error if exists */}
        {dataError && selectedMachine && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p><strong>Data Connection Error:</strong> {dataError}</p>
            <p className="text-sm">Showing last known data or defaults. Check your InfluxDB connection.</p>
          </div>
        )}

        {/* Show loading indicator */}
        {dataLoading && selectedMachine && (
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
        />

        <MetricsCards
          waterTank={waterTank}
          launchDate={machineInfo.launchDate}
          machineStatus={machineInfo.status}
        />

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
              Data age: {Math.round(liveData.dataAge / 1000)}s • Compressor: {liveData.compressorOn ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AWGDashboard;
