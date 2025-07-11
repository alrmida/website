
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
import { useSimpleMachineData } from '@/hooks/useSimpleMachineData';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('daily');

  // Use the new simple machine data hook
  const { data: machineData, loading: dataLoading, error: dataError } = useSimpleMachineData(selectedMachine);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
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
          console.log('Setting initial machine:', initialMachine);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  const handleMachineSelect = (machine: MachineWithClient) => {
    console.log('Selected machine:', machine);
    setSelectedMachine(machine);
  };

  // Prepare data for components
  const waterTank = {
    currentLevel: machineData?.waterLevel || 0,
    maxCapacity: 10.0,
    percentage: Math.round(((machineData?.waterLevel || 0) / 10.0) * 100)
  };

  const machineStatus = machineData?.status || 'Loading...';

  // Simple production data for now (will be enhanced later)
  const dailyProductionData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      production: Math.random() * 50 // Placeholder data
    };
  });

  const monthlyProductionData = Array.from({ length: 3 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (2 - i));
    return {
      month: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      production: Math.random() * 1000 // Placeholder data
    };
  });

  const statusData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      producing: Math.random() * 12,
      idle: Math.random() * 8,
      fullWater: Math.random() * 4,
      disconnected: 0
    };
  });

  const monthlyStatusData = Array.from({ length: 3 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (2 - i));
    return {
      month: date.getMonth() < 10 ? `${date.getFullYear()}-0${date.getMonth() + 1}` : `${date.getFullYear()}-${date.getMonth() + 1}`,
      producing: Math.random() * 300,
      idle: Math.random() * 200,
      fullWater: Math.random() * 100,
      disconnected: Math.random() * 50
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Machine Selection */}
        <MachineSelector 
          onMachineSelect={handleMachineSelect} 
          selectedMachine={selectedMachine}
        />

        {/* Show error if data fetch fails */}
        {dataError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p>Error fetching machine data: {dataError}</p>
          </div>
        )}

        {/* Machine Info - Show for commercial users only */}
        {selectedMachine && profile?.role === 'commercial' && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={machineData ? {
              lastUpdated: machineData.lastUpdate,
              waterLevel: machineData.waterLevel,
              ambient_temp_c: null,
              current_a: null,
              compressor_on: machineData.compressorOn,
            } : null}
            loading={dataLoading}
            onRefresh={() => {}} // Will be handled by the hook
          />
        )}

        {/* Metrics Cards Grid */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={machineStatus}
          totalWaterProduced={0} // Will be calculated properly later
          lastUpdate={machineData?.lastUpdate ? new Date(machineData.lastUpdate) : null}
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
        liveData={machineData ? {
          lastUpdated: machineData.lastUpdate,
          waterLevel: machineData.waterLevel,
          ambient_temp_c: null,
          current_a: null,
          compressor_on: machineData.compressorOn,
        } : null}
      />
    </div>
  );
};

export default ClientDashboard;
