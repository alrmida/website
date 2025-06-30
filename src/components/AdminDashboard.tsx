
import React, { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import AdminPanel from './AdminPanel';
import RealTimeDataTable from './RealTimeDataTable';
import MachineSelector from './MachineSelector';
import MachineInfo from './MachineInfo';
import WaterProductionMetrics from './WaterProductionMetrics';
import MetricsCards from './MetricsCards';
import ESGMetrics from './ESGMetrics';
import ProductionAnalytics from './ProductionAnalytics';
import DashboardFooter from './DashboardFooter';
import { MachineWithClient } from '@/types/machine';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { usePeriodicWaterProduction } from '@/hooks/usePeriodicWaterProduction';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
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

  // Get periodic production data for the metrics
  const { data: periodicProduction } = usePeriodicWaterProduction(selectedMachine?.machine_id);

  // Only true admins should see this dashboard
  if (profile?.role !== 'admin') {
    return null;
  }

  const handleMachineSelect = (machine: MachineWithClient) => {
    console.log('Admin selected machine:', machine);
    setSelectedMachine(machine);
  };

  const handleRefresh = () => {
    console.log('🔄 Admin manual refresh triggered - live data will auto-refresh');
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

  // Use periodic production total if available, otherwise fall back to dashboard data
  const displayTotalWaterProduced = periodicProduction.totalProduced > 0 
    ? periodicProduction.totalProduced 
    : totalWaterProduced;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage machines, users, and monitor real-time data
              </p>
            </div>
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Open Admin Panel
            </button>
          </div>
        </div>

        {/* Machine Selection */}
        <MachineSelector 
          onMachineSelect={handleMachineSelect} 
          selectedMachine={selectedMachine}
        />

        {/* Machine Info and Water Tank */}
        {selectedMachine && (
          <MachineInfo
            machineId={selectedMachine.machine_id}
            liveData={processedLiveData}
            loading={liveDataLoading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Metrics Cards Grid */}
        <MetricsCards 
          waterTank={waterTank}
          machineStatus={machineStatus}
          totalWaterProduced={displayTotalWaterProduced}
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

        {/* Water Production Metrics */}
        <WaterProductionMetrics liveData={processedLiveData} />

        {/* ESG Metrics */}
        <ESGMetrics totalWaterProduced={displayTotalWaterProduced} />

        {/* Real-time Data Collection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Real-time Data Collection
          </h2>
          <RealTimeDataTable />
        </div>

        {/* Admin Panel Modal */}
        <AdminPanel 
          open={adminPanelOpen}
          onOpenChange={setAdminPanelOpen}
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

export default AdminDashboard;
