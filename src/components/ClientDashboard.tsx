
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
    <div className="min-h-screen bg-kumulus-cream dark:bg-gray-900 overflow-x-hidden">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section - improved mobile spacing */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-kumulus-dark-blue dark:text-white mb-3 sm:mb-4 leading-tight">
            Welcome to Your Kumulus Dashboard
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
            Monitor your atmospheric water generation system in real-time
          </p>
          {profile?.role === 'client' && selectedMachine && (
            <div className="mt-4 p-3 sm:p-4 bg-kumulus-blue/10 border border-kumulus-blue/20 rounded-lg overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-kumulus-blue text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Client:</span>
                  <span className="break-words">{profile.username}</span>
                </div>
                <span className="text-kumulus-blue/60 hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Machine:</span>
                  <span className="font-mono break-all">{selectedMachine.machine_id}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Machine Selection */}
        <div className="mb-6 sm:mb-8">
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

        {/* Machine Info - Show basic machine information */}
        {selectedMachine && (
          <div className="mb-6 sm:mb-8">
            <MachineInfo
              machine={selectedMachine}
              showOwner={profile?.role === 'commercial'}
            />
          </div>
        )}

        {/* Metrics Cards Grid - mobile optimized spacing */}
        <div className="mb-6 sm:mb-8">
          <MetricsCards 
            waterTank={waterTank}
            machineStatus={liveData?.status || 'Loading...'}
            totalWaterProduced={totalWaterProduced}
            lastUpdate={productionData.lastProductionEvent ? productionData.lastProductionEvent.toISOString() : null}
          />
        </div>

        {/* Production Analytics - Charts and Visualizations */}
        <div className="mb-6 sm:mb-8">
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
