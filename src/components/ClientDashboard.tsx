
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import MetricsCards from './MetricsCards';
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

  // Get periodic production data for the metrics - this runs the background calculation
  const { data: periodicProduction, isLoading: periodicLoading } = usePeriodicWaterProduction(selectedMachine?.machine_id);

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

  // Background water production calculation effect
  useEffect(() => {
    if (!selectedMachine?.machine_id) return;

    console.log('🔄 Water production calculation system active for machine:', selectedMachine.machine_id);
    console.log('📊 Current periodic production total:', periodicProduction.totalProduced);
    console.log('⚡ Production rate:', periodicProduction.productionRate, 'L/h');
    
    // The usePeriodicWaterProduction hook handles the background calculation
    // It fetches data every 5 minutes and processes production periods
    // The calculate-water-production edge function runs every 30 minutes via cron
    
  }, [selectedMachine?.machine_id, periodicProduction.totalProduced, periodicProduction.productionRate]);

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

  // Use periodic production total if available and greater than 0, otherwise fall back to dashboard data
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

        {/* Machine Info and Water Tank - Show for commercial users only */}
        {selectedMachine && profile?.role === 'commercial' && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={processedLiveData}
            loading={liveDataLoading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Metrics Cards Grid - Updated with periodic production data and last update timestamp */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={machineStatus}
          totalWaterProduced={displayTotalWaterProduced}
          lastUpdate={periodicProduction.lastUpdate}
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
