import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from './DashboardHeader';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import WaterProductionMetrics from './WaterProductionMetrics';
import DashboardFooter from './DashboardFooter';
import RawDataManagement from './admin/RawDataManagement';
import RealTimeDataTable from './RealTimeDataTable';

const AWGDashboard = () => {
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Fetch the latest machine ID from the machine_profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('machine_profiles')
          .select('machine_id')
          .limit(1);

        if (profilesError) {
          console.error('Error fetching machine profiles:', profilesError);
          throw profilesError;
        }

        if (profiles && profiles.length > 0) {
          const initialMachineId = profiles[0].machine_id;
          setSelectedMachineId(initialMachineId);
          console.log('Setting initial machine ID:', initialMachineId);

          // Fetch live data for the initial machine ID
          await fetchLiveData(initialMachineId);
        } else {
          console.warn('No machine profiles found.');
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedMachineId) {
      fetchLiveData(selectedMachineId);
    }
  }, [selectedMachineId]);

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

  const handleMachineSelect = async (machineId: string) => {
    console.log('Selected machine ID:', machineId);
    setSelectedMachineId(machineId);
    await fetchLiveData(machineId);
  };

  const handleRefresh = () => {
    if (selectedMachineId) {
      fetchLiveData(selectedMachineId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Machine Selection and Live Data Display */}
        <MachineSelector onSelect={handleMachineSelect} />
        {selectedMachineId && (
          <MachineInfo
            machineId={selectedMachineId}
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
      
      <DashboardFooter />
    </div>
  );
};

export default AWGDashboard;
