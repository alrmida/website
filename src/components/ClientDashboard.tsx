
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="heading-xl mb-2">
            Welcome to Your Kumulus Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your atmospheric water generation system in real-time
          </p>
        </div>

        {/* Machine Selection */}
        <div className="mb-6">
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

        {/* Debug info for data source and analytics */}
        {selectedMachine && (
          <div className="mb-6 p-4 bg-kumulus-blue/5 border border-kumulus-blue/20 rounded-lg text-sm">
            <div className="text-kumulus-blue font-medium mb-2">📊 System Information</div>
            <div className="space-y-1 text-kumulus-dark-blue/70">
              <p>Analytics Data: {totalWaterProduced > 0 ? 'Real production data available' : 'Using static/zero data (no production events found)'}</p>
              <p>Machine: {selectedMachine.machine_id} | Status: {liveData?.status || 'Loading...'} | Source: {liveData?.dataSource || 'none'}</p>
              {liveData?.dataSource === 'live' && (
                <p>🌐 Live Connection: Active via edge function | Water Level: {liveData.waterLevel?.toFixed(3)}L</p>
              )}
              {liveData?.dataSource === 'fallback' && (
                <p>⚠️ Fallback Mode: Using database tables (edge function unavailable)</p>
              )}
            </div>
          </div>
        )}

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

        {/* Metrics Cards Grid - Now using actual production event timestamp */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={liveData?.status || 'Loading...'}
          totalWaterProduced={totalWaterProduced}
          lastUpdate={productionData.lastProductionEvent}
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
