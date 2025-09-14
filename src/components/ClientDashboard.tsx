import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
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

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const { t } = useLocalization();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Use dashboard data from summary tables
  const {
    machineInfo,
    waterTank,
    liveData,
    dailyProductionData,
    weeklyProductionData,
    monthlyProductionData,
    yearlyProductionData,
    statusData,
    weeklyStatusData,
    monthlyStatusData,
    yearlyStatusData,
    totalWaterProduced,
    dataLoading,
    dataError
  } = useDashboardData(selectedMachine);


  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        console.log('🔍 [CLIENT DASHBOARD] Fetching machines with production data priority...');
        
        // First, try to find machines with production data
        const { data: productionCheck } = await supabase
          .from('water_production_events')
          .select('machine_id, production_liters')
          .gt('production_liters', 0)
          .order('timestamp_utc', { ascending: false });

        const machinesWithProduction = productionCheck ? 
          [...new Set(productionCheck.map(event => event.machine_id))] : [];

        console.log('📊 [CLIENT DASHBOARD] Found machines with production data:', machinesWithProduction);

        // Fetch all machines
        const { data: machines, error: machinesError } = await supabase
          .from('machines')
          .select('*')
          .order('created_at', { ascending: false });

        if (machinesError) {
          console.error('❌ [CLIENT DASHBOARD] Error fetching machines:', machinesError);
          return;
        }

        if (machines && machines.length > 0) {
          // Prioritize machines with production data
          let selectedMachine = machines.find(m => machinesWithProduction.includes(m.machine_id));
          
          // If no machine with production data, use the first available
          if (!selectedMachine) {
            selectedMachine = machines[0];
            console.log('⚠️ [CLIENT DASHBOARD] No machines with production data, using first available');
          }

          setSelectedMachine(selectedMachine as MachineWithClient);
          console.log('✅ [CLIENT DASHBOARD] Setting priority machine:', {
            machineId: selectedMachine.machine_id,
            hasProductionData: machinesWithProduction.includes(selectedMachine.machine_id),
            totalMachines: machines.length,
            machinesWithData: machinesWithProduction.length
          });
        } else {
          console.log('ℹ️ [CLIENT DASHBOARD] No machines found in database');
        }
      } catch (error) {
        console.error('❌ [CLIENT DASHBOARD] Error fetching initial data:', error);
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
      
      {/* Main content with proper top spacing to account for sticky header */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8 pt-20 sm:pt-24">
        {/* Welcome Section - improved mobile spacing */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-kumulus-dark-blue dark:text-white mb-3 sm:mb-4 leading-tight">
                {t('header.welcome')}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                Monitor your atmospheric water generation system in real-time
              </p>
            </div>
            
          </div>
          
          {profile?.role === 'client' && selectedMachine && (
            <div className="mt-4 p-3 sm:p-4 bg-kumulus-blue/10 border border-kumulus-blue/20 rounded-lg overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-kumulus-blue text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Client:</span>
                  <span className="break-words">{profile.username}</span>
                </div>
                <span className="text-kumulus-blue/60 hidden sm:inline">•</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('machine.id')}:</span>
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
            lastUpdate={new Date().toISOString()}
          />
        </div>

        {/* Production Analytics - Charts and Visualizations */}
        <div className="mb-6 sm:mb-8">
          <ProductionAnalytics
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            dailyProductionData={dailyProductionData}
            weeklyProductionData={weeklyProductionData}
            monthlyProductionData={monthlyProductionData}
            yearlyProductionData={yearlyProductionData}
            statusData={statusData}
            weeklyStatusData={weeklyStatusData}
            monthlyStatusData={monthlyStatusData}
            yearlyStatusData={yearlyStatusData}
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
