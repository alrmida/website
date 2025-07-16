
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MachineWithClient } from '@/types/machine';

interface MachineDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: MachineWithClient | null;
  onSuccess: () => void;
}

const MachineDeleteDialog = ({ open, onOpenChange, machine, onSuccess }: MachineDeleteDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!machine) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', machine.id);

      if (error) {
        console.error('Error deleting machine:', error);
        toast({
          title: 'Error',
          description: `Failed to delete machine: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Machine deleted successfully',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete machine',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!machine) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Machine</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the machine "{machine.name}" (ID: {machine.machine_id})?
            <br />
            <br />
            <strong>Warning:</strong> This action cannot be undone. All data associated with this machine will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Machine'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MachineDeleteDialog;
