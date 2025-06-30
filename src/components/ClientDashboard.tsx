import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import WaterProductionMetrics from './WaterProductionMetrics';
import MetricsCards from './MetricsCards';
import ESGMetrics from './ESGMetrics';
import ProductionAnalytics from './ProductionAnalytics';
import DashboardFooter from './DashboardFooter';
import { MachineWithClient } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { usePeriodicWaterProduction } from '@/hooks/usePeriodicWaterProduction';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Use the live machine data hook for real-time updates
  const { data: liveData, isLoading: liveDataLoading } = useLiveMachineData(selectedMachine?.machine_id);

  // Get dashboard data including charts data
  const {
    dailyProductionData,
    monthlyProductionData,
    statusData,
    monthlyStatusData,
    totalWaterProduced
  } = useDashboardData(selectedMachine);

  // Get periodic production data for the metrics
  const { data: periodicProduction } = usePeriodicWaterProduction(selectedMachine?.machine_id);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch the latest machine from the machines table
        const { data: machines, error: machinesError } = await supabase
          .from('machines')
          .select('*')
          .limit(1);

        if (machinesError) {
          console.error('Error fetching machines:', machinesError);
          throw machinesError;
        }

        if (machines && machines.length > 0) {
          const initialMachine = machines[0];
          setSelectedMachine(initialMachine as MachineWithClient);
          console.log('Setting initial machine:', initialMachine);
        } else {
          console.warn('No machines found.');
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  const handleMachineSelect = async (machine: MachineWithClient) => {
    console.log('Selected machine:', machine);
    setSelectedMachine(machine);
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered - live data will auto-refresh');
    // The useLiveMachineData hook handles refreshing automatically
  };

  // Convert live data structure to match the expected format
  const processedLiveData = liveData ? {
    lastUpdated: liveData.lastUpdated,
    waterLevel: liveData.waterLevel,
    ambient_temp_c: null, // Not available in live data structure
    current_a: null, // Not available in live data structure
    compressor_on: liveData.compressorOn,
    // Add other properties as needed
  } : null;

  // Prepare data for MetricsCards component - use periodic production data when available
  const waterTank = {
    currentLevel: liveData?.waterLevel || 0,
    maxCapacity: 10.0,
    percentage: Math.round(((liveData?.waterLevel || 0) / 10.0) * 100)
  };

  const machineStatus = liveData?.status || 'Loading...';

  // Use periodic production total if available, otherwise fall back to dashboard data
  const displayTotalWaterProduced = periodicProduction.totalProduced > 0 
    ? periodicProduction.totalProduced 
    : totalWaterProduced;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Machine Selection */}
        <MachineSelector 
          onMachineSelect={handleMachineSelect} 
          selectedMachine={selectedMachine}
        />

        {/* Machine Info and Water Tank - Only show for admin users */}
        {selectedMachine && profile?.role === 'admin' && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={processedLiveData}
            loading={liveDataLoading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Metrics Cards Grid */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={machineStatus}
          totalWaterProduced={displayTotalWaterProduced}
        />

        {/* Production Analytics - Charts and Visualizations */}
        <ProductionAnalytics
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          dailyProductionData={dailyProductionData}
          monthlyProductionData={monthlyProductionData}
          statusData={statusData}
          monthlyStatusData={monthlyStatusData}
        />

        {/* Water Production Metrics - Only show for admin users */}
        {profile?.role === 'admin' && (
          <WaterProductionMetrics liveData={processedLiveData} />
        )}

        {/* ESG Metrics - Only show for admin users */}
        {profile?.role === 'admin' && (
          <ESGMetrics totalWaterProduced={displayTotalWaterProduced} />
        )}
      </main>
      
      <DashboardFooter 
        profile={profile}
        selectedMachine={selectedMachine}
        liveData={processedLiveData}
      />
    </div>
  );
};

export default ClientDashboard;
