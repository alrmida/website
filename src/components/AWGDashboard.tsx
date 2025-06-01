
import React, { useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import MachineInfoHeader from '@/components/MachineInfoHeader';
import MetricsCards from '@/components/MetricsCards';
import ProductionAnalytics from '@/components/ProductionAnalytics';

const AWGDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Machine information
  const machineInfo = {
    machineId: 'AWG-001-2024',
    machineName: 'Kumulus AWG Unit #1',
    location: 'Barcelona, Spain',
    status: 'Producing',
    launchDate: 'March 15, 2024'
  };

  // Water tank specifications
  const waterTank = {
    currentLevel: 10.0,
    maxCapacity: 12.0,
    percentage: 83
  };

  // Mock data for daily production
  const dailyProductionData = [
    { date: '01 Jun', production: 15.2 },
    { date: '29 May', production: 31.5 },
    { date: '30 May', production: 47.8 },
    { date: '31 May', production: 19.6 }
  ];

  // Mock data for monthly production
  const monthlyProductionData = [
    { month: 'Apr 2025', production: 2250 },
    { month: 'Mar 2025', production: 1850 },
    { month: 'May 2025', production: 1950 }
  ];

  // Mock data for status tracking
  const statusData = [
    { date: '01 Jun', producing: 18, idle: 2, fullWater: 1, disconnected: 3 },
    { date: '26 May', producing: 19, idle: 1, fullWater: 2, disconnected: 2 },
    { date: '27 May', producing: 22, idle: 1, fullWater: 1, disconnected: 0 },
    { date: '28 May', producing: 19, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '29 May', producing: 21, idle: 1, fullWater: 1, disconnected: 1 },
    { date: '30 May', producing: 12, idle: 6, fullWater: 3, disconnected: 3 },
    { date: '31 May', producing: 10, idle: 6, fullWater: 4, disconnected: 4 }
  ];

  const monthlyStatusData = [
    { month: '2025-03', producing: 68.9, idle: 14.1, fullWater: 5.2, disconnected: 11.8 },
    { month: '2025-04', producing: 85.2, idle: 8.5, fullWater: 3.1, disconnected: 3.2 },
    { month: '2025-05', producing: 72.4, idle: 15.6, fullWater: 6.8, disconnected: 5.2 },
    { month: '2025-06', producing: 78.1, idle: 12.3, fullWater: 4.9, disconnected: 4.7 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          © 2025 Kumulus Water • Last updated: 2025-06-01 07:39
        </div>
      </div>
    </div>
  );
};

export default AWGDashboard;
