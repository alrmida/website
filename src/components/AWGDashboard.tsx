
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import WaterProductionMetrics from './WaterProductionMetrics';
import DashboardFooter from './DashboardFooter';
import RawDataManagement from './admin/RawDataManagement';
import RealTimeDataTable from './RealTimeDataTable';
import { MachineWithClient } from '@/types/machine';

const AWGDashboard = () => {
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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', machineId)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching live data:', error);
        throw error;
      }

      if (data) {
        // Convert timestamp_utc to Date object
        const lastUpdated = new Date(data.timestamp_utc);

        // Extract relevant data and convert water_level_l to a number
        const waterLevel = data.water_level_l !== null ? Number(data.water_level_l) : null;
        const collector_ls1 = data.collector_ls1 !== null ? Number(data.collector_ls1) : null;
        const compressor_on = data.compressor_on !== null ? Number(data.compressor_on) : null;

        setLiveData({
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
        });
      } else {
        console.log('No live data found for machine ID:', machineId);
        setLiveData(null);
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMachineSelect = async (machine: MachineWithClient) => {
    console.log('Selected machine:', machine);
    setSelectedMachine(machine);
    await fetchLiveData(machine.machine_id);
  };

  const handleRefresh = () => {
    if (selectedMachine) {
      fetchLiveData(selectedMachine.machine_id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Machine Selection and Live Data Display */}
        <MachineSelector 
          onMachineSelect={handleMachineSelect} 
          selectedMachine={selectedMachine}
        />
        {selectedMachine && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={liveData}
            loading={loading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Water Production Metrics */}
        <WaterProductionMetrics liveData={liveData} />

        {/* Real-Time Data Collection Table */}
        <RealTimeDataTable />

        {/* Raw Data Management */}
        <RawDataManagement loading={loading} onRefresh={handleRefresh} />
      </main>
      
      <DashboardFooter 
        profile={null}
        selectedMachine={selectedMachine}
        liveData={liveData}
      />
    </div>
  );
};

export default AWGDashboard;
