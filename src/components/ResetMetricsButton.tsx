
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ResetMetricsButtonProps {
  machineId: string;
  onResetComplete?: () => void;
}

const ResetMetricsButton = ({ machineId, onResetComplete }: ResetMetricsButtonProps) => {
  const [isResetting, setIsResetting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleReset = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to reset metrics",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);
    try {
      console.log('🔄 Resetting all metrics for machine:', machineId);
      
      // Call the reset function for all metrics
      const { error: resetError } = await supabase.rpc('reset_machine_metrics', {
        p_machine_id: machineId,
        p_admin_user_id: user.id
      });

      if (resetError) {
        throw resetError;
      }

      // Clear the new tracking tables
      const { error: snapshotsError } = await supabase
        .from('simple_water_snapshots')
        .delete()
        .eq('machine_id', machineId);

      if (snapshotsError) {
        console.error('Error clearing snapshots:', snapshotsError);
        throw new Error(`Failed to clear snapshots: ${snapshotsError.message}`);
      }

      const { error: eventsError } = await supabase
        .from('water_production_events')
        .delete()
        .eq('machine_id', machineId);

      if (eventsError) {
        console.error('Error clearing events:', eventsError);
        throw new Error(`Failed to clear events: ${eventsError.message}`);
      }

      // Clear raw machine data for clean analytics - this is critical for the status analytics graph
      const { error: rawDataError } = await supabase
        .from('raw_machine_data')
        .delete()
        .eq('machine_id', machineId);

      if (rawDataError) {
        console.error('Error clearing raw machine data:', rawDataError);
        throw new Error(`Failed to clear raw machine data: ${rawDataError.message}`);
      }

      // Clear water production periods
      const { error: periodsError } = await supabase
        .from('water_production_periods')
        .delete()
        .eq('machine_id', machineId);

      if (periodsError) {
        console.error('Error clearing production periods:', periodsError);
        throw new Error(`Failed to clear production periods: ${periodsError.message}`);
      }

      // Clear water level snapshots
      const { error: levelSnapshotsError } = await supabase
        .from('water_level_snapshots')
        .delete()
        .eq('machine_id', machineId);

      if (levelSnapshotsError) {
        console.error('Error clearing level snapshots:', levelSnapshotsError);
        throw new Error(`Failed to clear level snapshots: ${levelSnapshotsError.message}`);
      }

      toast({
        title: "Success",
        description: `All metrics and historical data reset for machine ${machineId}`,
      });

      console.log('✅ All metrics and historical data reset successfully');
      onResetComplete?.();

    } catch (error) {
      console.error('❌ Error resetting metrics:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to reset metrics',
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-600 hover:bg-red-50"
          disabled={isResetting}
        >
          {isResetting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-2" />
          )}
          Reset All Metrics
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset All Metrics and Historical Data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete ALL data for machine {machineId}:
            <br />• Production events and snapshots
            <br />• Raw machine data (for analytics)
            <br />• Production periods and metrics
            <br />• Water level snapshots
            <br /><br />
            This will completely clear the status analytics graphs and provide a fresh baseline for precision testing.
            <br /><br />
            This action cannot be undone. Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            className="bg-red-600 hover:bg-red-700"
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset All Data'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetMetricsButton;
