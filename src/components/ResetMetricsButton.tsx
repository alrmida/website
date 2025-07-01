
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

      // Also clear the new tracking tables
      const { error: snapshotsError } = await supabase
        .from('simple_water_snapshots')
        .delete()
        .eq('machine_id', machineId);

      if (snapshotsError) {
        console.warn('Warning clearing snapshots:', snapshotsError);
      }

      const { error: eventsError } = await supabase
        .from('water_production_events')
        .delete()
        .eq('machine_id', machineId);

      if (eventsError) {
        console.warn('Warning clearing events:', eventsError);
      }

      toast({
        title: "Success",
        description: `All metrics reset for machine ${machineId}`,
      });

      console.log('✅ All metrics reset successfully');
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
          <AlertDialogTitle>Reset All Metrics?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all water production data for machine {machineId}:
            <br />• Production events
            <br />• Water snapshots  
            <br />• Production metrics
            <br />• Analytics data
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
            {isResetting ? 'Resetting...' : 'Reset All Metrics'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ResetMetricsButton;
