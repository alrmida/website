
import React from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface UIDAssignment {
  machine_id: string;
  machine_name: string;
  assigned_at: string;
}

interface ReassignUIDConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  uid: string;
  currentAssignment: UIDAssignment | null;
  targetMachineName: string;
}

const ReassignUIDConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  uid,
  currentAssignment,
  targetMachineName,
}: ReassignUIDConfirmDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  // Don't render if no current assignment
  if (!currentAssignment) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm UID Reassignment
          </AlertDialogTitle>
          <AlertDialogDescription>
            This microcontroller UID is currently assigned to another machine.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Reassigning this UID will disconnect it from the current machine,
              which may cause data collection interruption.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <div>
              <strong>UID:</strong> <code className="bg-gray-100 px-1 rounded">{uid}</code>
            </div>
            <div>
              <strong>Currently assigned to:</strong> {currentAssignment.machine_name} ({currentAssignment.machine_id})
            </div>
            <div>
              <strong>Will be reassigned to:</strong> {targetMachineName}
            </div>
            <div>
              <strong>Originally assigned:</strong> {new Date(currentAssignment.assigned_at).toLocaleString()}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to proceed with this reassignment?
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-amber-600 hover:bg-amber-700">
            Confirm Reassignment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReassignUIDConfirmDialog;
