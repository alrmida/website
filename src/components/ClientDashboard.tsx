
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import WaterProductionMetrics from './WaterProductionMetrics';
import MetricsCards from './MetricsCards';
import ESGMetrics from './ESGMetrics';
import DashboardFooter from './DashboardFooter';
import { MachineWithClient } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
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

          // Fetch live data for the initial machine
          await fetchLiveData(initialMachine.machine_id);
        } else {
          console.warn('No machines found.');
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const fetchLiveData = async (machineId: string) => {
    console.log('🔄 Fetching live data for machine:', machineId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', machineId)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching live data:', error);
        setLiveData(null);
        return;
      }

      if (data) {
        // Convert timestamp_utc to Date object
        const lastUpdated = new Date(data.timestamp_utc);

        // Extract relevant data and convert water_level_l to a number
        const waterLevel = data.water_level_l !== null ? Number(data.water_level_l) : null;
        const collector_ls1 = data.collector_ls1 !== null ? Number(data.collector_ls1) : null;
        const compressor_on = data.compressor_on !== null ? Number(data.compressor_on) : null;

        const processedLiveData = {
          lastUpdated: lastUpdated.toISOString(),
          waterLevel,
          collector_ls1,
          compressor_on,
          ambient_temp_c: data.ambient_temp_c,
          ambient_rh_pct: data.ambient_rh_pct,
          refrigerant_temp_c: data.refrigerant_temp_c,
          exhaust_temp_c: data.exhaust_temp_c,
          current_a: data.current_a,
          treating_water: data.treating_water,
          serving_water: data.serving_water,
          producing_water: data.producing_water,
          full_tank: data.full_tank,
          disinfecting: data.disinfecting,
        };

        console.log('✅ Successfully fetched live data:', processedLiveData);
        setLiveData(processedLiveData);
      } else {
        console.log('No live data found for machine ID:', machineId);
        setLiveData(null);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      setLiveData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMachineSelect = async (machine: MachineWithClient) => {
    console.log('Selected machine:', machine);
    setSelectedMachine(machine);
    await fetchLiveData(machine.machine_id);
  };

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    if (selectedMachine) {
      await fetchLiveData(selectedMachine.machine_id);
    }
  };

  // Prepare data for MetricsCards component
  const waterTank = {
    currentLevel: liveData?.waterLevel || 0,
    maxCapacity: 10.0,
    percentage: Math.round(((liveData?.waterLevel || 0) / 10.0) * 100)
  };

  const machineStatus = liveData?.compressor_on === 1 ? 'Producing' : 'Idle';
  const totalWaterProduced = 1245.7; // Static value for demo

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Machine Selection */}
        <MachineSelector 
          onMachineSelect={handleMachineSelect} 
          selectedMachine={selectedMachine}
        />

        {/* Machine Info and Water Tank */}
        {selectedMachine && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={liveData}
            loading={loading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Metrics Cards Grid */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={machineStatus}
          totalWaterProduced={totalWaterProduced}
        />

        {/* Water Production Metrics */}
        <WaterProductionMetrics liveData={liveData} />

        {/* ESG Metrics */}
        <ESGMetrics totalWaterProduced={totalWaterProduced} />
      </main>
      
      <DashboardFooter 
        profile={profile}
        selectedMachine={selectedMachine}
        liveData={liveData}
      />
    </div>
  );
};

export default ClientDashboard;
