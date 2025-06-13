
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardHeader from '@/components/DashboardHeader';
import MetricsCards from '@/components/MetricsCards';
import ProductionAnalytics from '@/components/ProductionAnalytics';
import MachineSelector from '@/components/MachineSelector';
import DashboardNotifications from '@/components/DashboardNotifications';
import WaterProductionMetrics from '@/components/WaterProductionMetrics';
import { useDashboardData } from '@/hooks/useDashboardData';
import { MachineWithClient } from '@/types/machine';

const AWGDashboard = () => {
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  
  const {
    machineInfo,
    waterTank,
    dailyProductionData,
    monthlyProductionData,
    statusData,
    monthlyStatusData,
    totalWaterProduced,
    liveData,
    dataLoading,
    dataError
  } = useDashboardData(selectedMachine);

  console.log('Live data in dashboard for machine:', selectedMachine?.machine_id, liveData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MachineSelector 
          onMachineSelect={setSelectedMachine}
          selectedMachine={selectedMachine}
        />

        <DashboardNotifications 
          selectedMachine={selectedMachine}
          dataError={dataError}
          dataLoading={dataLoading}
          liveData={liveData}
        />

        {/* Add Water Production Metrics for the live data machine */}
        {selectedMachine?.machine_id === 'KU001619000079' && (
          <WaterProductionMetrics liveData={liveData} />
        )}

        <MetricsCards
          waterTank={waterTank}
          machineStatus={machineInfo.status}
          totalWaterProduced={totalWaterProduced}
        />

        <ProductionAnalytics
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          dailyProductionData={dailyProductionData}
          monthlyProductionData={monthlyProductionData}
          statusData={statusData}
          monthlyStatusData={monthlyStatusData}
        />
      </div>
    </div>
  );
};

export default AWGDashboard;
