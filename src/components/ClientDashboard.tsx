
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import MetricsCards from './MetricsCards';
import ProductionAnalytics from './ProductionAnalytics';
import DashboardFooter from './DashboardFooter';
import DashboardNotifications from './DashboardNotifications';
import { MachineWithClient } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useSimpleWaterProduction } from '@/hooks/useSimpleWaterProduction';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Use the new dashboard data hook that handles both live data and analytics
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

  // Get the actual production tracking data with real timestamps
  const { data: productionData } = useSimpleWaterProduction(
    selectedMachine?.machine_id, 
    liveData?.waterLevel
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log('🔍 Fetching initial machine data...');
        
        // Fetch the first available machine
        const { data: machines, error: machinesError } = await supabase
          .from('machines')
          .select('*')
          .limit(1);

        if (machinesError) {
          console.error('Error fetching machines:', machinesError);
          return;
        }

        if (machines && machines.length > 0) {
          const initialMachine = machines[0];
          setSelectedMachine(initialMachine as MachineWithClient);
          console.log('✅ Setting initial machine:', initialMachine.machine_id);
        } else {
          console.log('ℹ️ No machines found in database');
        }
      } catch (error) {
        console.error('❌ Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  const handleMachineSelect = (machine: MachineWithClient) => {
    console.log('🔄 Selected machine:', machine.machine_id);
    setSelectedMachine(machine);
  };

  return (
    <div className="min-h-screen bg-kumulus-cream dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-kumulus-dark-blue dark:text-white mb-4">
            Welcome to Your Kumulus Dashboard
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-6">
            Monitor your atmospheric water generation system in real-time
          </p>
          {profile?.role === 'client' && selectedMachine && (
            <div className="mt-4 p-4 bg-kumulus-blue/10 border border-kumulus-blue/20 rounded-lg">
              <div className="flex items-center gap-2 text-kumulus-blue">
                <span className="font-medium">Client:</span>
                <span>{profile.username}</span>
                <span className="text-kumulus-blue/60">•</span>
                <span className="font-medium">Machine:</span>
                <span>{selectedMachine.machine_id}</span>
              </div>
            </div>
          )}
        </div>

        {/* Machine Selection */}
        <div className="mb-8">
          <MachineSelector 
            onMachineSelect={handleMachineSelect} 
            selectedMachine={selectedMachine}
          />
        </div>

        {/* Dashboard Notifications - Show connection status and errors */}
        <DashboardNotifications
          selectedMachine={selectedMachine}
          dataError={dataError}
          dataLoading={dataLoading}
          liveData={liveData}
        />

        {/* Machine Info - Show for commercial users only */}
        {selectedMachine && profile?.role === 'commercial' && (
          <div className="mb-8">
            <MachineInfo
              machineId={selectedMachine.machine_id}
              liveData={liveData ? {
                lastUpdated: liveData.lastUpdated,
                waterLevel: liveData.waterLevel,
                ambient_temp_c: null,
                current_a: null,
                compressor_on: liveData.compressorOn,
              } : null}
              loading={dataLoading}
              onRefresh={() => {}} // Will be handled by the hook
            />
          </div>
        )}

        {/* Metrics Cards Grid - Now using actual production event timestamp converted to string */}
        <div className="mb-8">
          <MetricsCards 
            waterTank={waterTank}
            machineStatus={liveData?.status || 'Loading...'}
            totalWaterProduced={totalWaterProduced}
            lastUpdate={productionData.lastProductionEvent ? productionData.lastProductionEvent.toISOString() : null}
          />
        </div>

        {/* Production Analytics - Charts and Visualizations */}
        <div className="mb-8">
          <ProductionAnalytics
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            dailyProductionData={dailyProductionData}
            monthlyProductionData={monthlyProductionData}
            statusData={statusData}
            monthlyStatusData={monthlyStatusData}
          />
        </div>
      </main>
      
      <DashboardFooter 
        profile={profile}
        selectedMachine={selectedMachine}
        liveData={liveData ? {
          lastUpdated: liveData.lastUpdated,
          waterLevel: liveData.waterLevel,
          ambient_temp_c: null,
          current_a: null,
          compressor_on: liveData.compressorOn,
        } : null}
      />
    </div>
  );
};

export default ClientDashboard;
