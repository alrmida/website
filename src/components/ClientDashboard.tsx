
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import MetricsCards from './MetricsCards';
import ProductionAnalytics from './ProductionAnalytics';
import DashboardFooter from './DashboardFooter';
import ResetMetricsButton from './ResetMetricsButton';
import DataPipelineMonitor from './DataPipelineMonitor';
import { MachineWithClient } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { useSimpleWaterProduction } from '@/hooks/useSimpleWaterProduction';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Use the live machine data hook for real-time updates
  const { data: liveData, isLoading: liveDataLoading } = useLiveMachineData(selectedMachine);

  // Get dashboard data including charts data
  const {
    dailyProductionData,
    monthlyProductionData,
    statusData,
    monthlyStatusData,
    totalWaterProduced,
    dataLoading,
    dataError
  } = useDashboardData(selectedMachine);

  // Use the new simplified water production system
  const { data: simpleProduction, isLoading: simpleProductionLoading, refetch: refetchSimpleProduction } = useSimpleWaterProduction(
    selectedMachine?.machine_id, 
    liveData?.waterLevel
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch the latest machine from the machines table with microcontroller_uid
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

  // Background water production tracking effect
  useEffect(() => {
    if (!selectedMachine?.machine_id || !liveData?.waterLevel) return;

    console.log('🔄 Simple water production tracking active for machine:', selectedMachine.machine_id);
    console.log('📊 Current total production:', simpleProduction.totalProduced);
    console.log('💧 Current water level:', liveData.waterLevel);
    console.log('📸 Last snapshot:', simpleProduction.lastSnapshot?.toISOString());
    
    // The useSimpleWaterProduction hook handles the automatic snapshots and calculations
    
  }, [selectedMachine?.machine_id, liveData?.waterLevel, simpleProduction.totalProduced]);

  const handleMachineSelect = async (machine: MachineWithClient) => {
    console.log('Selected machine:', machine);
    setSelectedMachine(machine);
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered - live data will auto-refresh');
    // The useLiveMachineData hook handles refreshing automatically
  };

  const handleResetComplete = () => {
    console.log('🔄 Metrics reset completed, refreshing data...');
    refetchSimpleProduction();
    // The other hooks will automatically refresh on next data fetch
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

  // Prepare data for MetricsCards component - use simple production data when available
  const waterTank = {
    currentLevel: liveData?.waterLevel || 0,
    maxCapacity: 10.0,
    percentage: Math.round(((liveData?.waterLevel || 0) / 10.0) * 100)
  };

  const machineStatus = liveData?.status || 'Loading...';

  // Use simple production total if available and greater than 0, otherwise fall back to dashboard data
  const displayTotalWaterProduced = simpleProduction.totalProduced > 0 
    ? simpleProduction.totalProduced 
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

        {/* Data Pipeline Monitor - Show for kumulus personnel to track restoration progress */}
        {profile?.role === 'commercial' && (
          <div className="mb-6">
            <DataPipelineMonitor selectedMachine={selectedMachine} />
          </div>
        )}

        {/* Reset Metrics Button - Show for commercial users */}
        {selectedMachine && profile?.role === 'commercial' && (
          <div className="mb-6 flex justify-end">
            <ResetMetricsButton 
              machineId={selectedMachine.machine_id}
              onResetComplete={handleResetComplete}
            />
          </div>
        )}

        {/* Machine Info and Water Tank - Show for commercial users only */}
        {selectedMachine && profile?.role === 'commercial' && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={processedLiveData}
            loading={liveDataLoading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Metrics Cards Grid - Updated with simple production data and last snapshot timestamp */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={machineStatus}
          totalWaterProduced={displayTotalWaterProduced}
          lastUpdate={simpleProduction.lastSnapshot}
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
