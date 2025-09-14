import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { MachineWithClient } from '@/types/machine';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardFooter } from '@/components/DashboardFooter';
import { DashboardNotifications } from '@/components/DashboardNotifications';
import { MachineSelector } from '@/components/MachineSelector';
import { MachineInfo } from '@/components/MachineInfo';
import { MetricsCards } from '@/components/MetricsCards';
import { ProductionAnalytics } from '@/components/ProductionAnalytics';
import { useLiveMachineData } from '@/hooks/useLiveMachineData';
import { useProductionSummaryData } from '@/hooks/useProductionSummaryData';
import { useSimpleWaterProduction } from '@/hooks/useSimpleWaterProduction';
import { triggerProductionAggregation } from '@/services/productionSummaryService';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';

const ClientDashboard = () => {
  const { profile } = useAuth();
  const { t } = useLocalization();
  const [selectedMachine, setSelectedMachine] = useState<MachineWithClient | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

  // Get live machine data for real-time status
  const { data: liveData } = useLiveMachineData(selectedMachine?.machine_id);

  // Get fast production summary data from pre-computed tables
  const { 
    data: summaryData, 
    isLoading: summaryLoading,
    refetch: refetchSummary
  } = useProductionSummaryData(selectedMachine?.machine_id);

  // Get simple water production total
  const { data: waterProduction } = useSimpleWaterProduction(selectedMachine?.machine_id);

  const handleMachineSelect = (machine: MachineWithClient) => {
    setSelectedMachine(machine);
  };

  // Trigger production data aggregation
  const handleAggregateData = async (mode: 'incremental' | 'backfill' = 'incremental') => {
    if (!selectedMachine) return;
    
    setIsAggregating(true);
    try {
      await triggerProductionAggregation(selectedMachine.machine_id, mode);
      toast.success(`${mode === 'backfill' ? 'Backfill' : 'Update'} completed!`);
      setTimeout(() => refetchSummary(), 2000);
    } catch (error) {
      toast.error(`Failed to ${mode === 'backfill' ? 'backfill' : 'update'} data`);
    } finally {
      setIsAggregating(false);
    }
  };

  // Prepare data for components
  const machineInfo = selectedMachine ? {
    id: selectedMachine.id,
    name: selectedMachine.name,
    location: selectedMachine.location || 'Unknown',
    model: selectedMachine.machine_model || 'AWG',
    status: liveData?.status || 'Disconnected',
    isOnline: liveData?.isOnline || false,
    lastUpdate: liveData?.lastUpdate || null
  } : null;

  const waterTank = liveData ? {
    currentLevel: liveData.waterLevel || 0,
    capacity: 10,
    percentage: Math.min(100, ((liveData.waterLevel || 0) / 10) * 100),
    status: liveData.fullTank ? 'Full' : liveData.waterLevel > 8 ? 'High' : liveData.waterLevel < 2 ? 'Low' : 'Normal'
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">
            {t('dashboard.title')}
          </h1>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAggregateData('incremental')}
              disabled={isAggregating || !selectedMachine}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAggregating ? 'animate-spin' : ''}`} />
              Update Data
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAggregateData('backfill')}
              disabled={isAggregating || !selectedMachine}
            >
              <Database className="h-4 w-4 mr-2" />
              Backfill All
            </Button>
          </div>
        </div>

        <MachineSelector onMachineSelect={handleMachineSelect} />

        {selectedMachine && (
          <>
            {machineInfo && <MachineInfo machine={machineInfo} />}

            {machineInfo && waterTank && (
              <MetricsCards
                waterTank={waterTank}
                machineStatus={machineInfo.status}
                totalWaterProduced={waterProduction.totalProduced || 0}
                lastUpdate={machineInfo.lastUpdate}
              />
            )}

            <ProductionAnalytics
              dailyData={summaryData.dailyData.map(d => ({ date: d.date, production: d.production }))}
              weeklyData={summaryData.weeklyData.map(d => ({ week: d.week, production: d.production }))} 
              monthlyData={summaryData.monthlyData.map(d => ({ month: d.month, production: d.production }))}
              yearlyData={summaryData.yearlyData.map(d => ({ year: d.year, production: d.production }))}
              statusData={summaryData.dailyData.map(d => ({
                date: d.date,
                producing: d.producing_percentage,
                idle: d.idle_percentage,
                fullWater: d.full_water_percentage,
                disconnected: d.disconnected_percentage
              }))}
              weeklyStatusData={summaryData.weeklyData.map(d => ({
                week: d.week,
                producing: d.producing_percentage,
                idle: d.idle_percentage,
                fullWater: d.full_water_percentage,
                disconnected: d.disconnected_percentage
              }))}
              monthlyStatusData={summaryData.monthlyData.map(d => ({
                month: d.month,
                producing: d.producing_percentage,
                idle: d.idle_percentage,
                fullWater: d.full_water_percentage,
                disconnected: d.disconnected_percentage
              }))}
              yearlyStatusData={summaryData.yearlyData.map(d => ({
                year: d.year,
                producing: d.producing_percentage,
                idle: d.idle_percentage,
                fullWater: d.full_water_percentage,
                disconnected: d.disconnected_percentage
              }))}
              totalProduction={waterProduction.totalProduced || 0}
              isLoading={summaryLoading}
            />
          </>
        )}
      </main>

      <DashboardFooter />
    </div>
  );
};

export default ClientDashboard;