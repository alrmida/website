
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './types';
import { MachineWithClient } from '@/types/machine';
import { isValidMachineId, isValidMicrocontrollerUID } from '@/types/machine';
import { useMicrocontrollerUID } from '@/hooks/useMicrocontrollerUID';
import { fetchUidAssignment, UIDAssignment } from '@/utils/uidHelpers';
import ReassignUIDConfirmDialog from './ReassignUIDConfirmDialog';
import { AlertTriangle } from 'lucide-react';

const machineEditSchema = z.object({
  machine_id: z.string().min(1, 'Machine ID is required').refine(isValidMachineId, {
    message: 'Machine ID must follow format KU00[123]619XXXXXX (6 digits after 619)',
  }),
  name: z.string().min(1, 'Name is required'),
  location: z.string().optional(),
  machine_model: z.string().optional(),
  purchase_date: z.string().optional(),
  microcontroller_uid: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    return isValidMicrocontrollerUID(val);
  }, {
    message: 'Microcontroller UID must be 24 hexadecimal characters',
  }),
  client_id: z.string().optional(),
});

type MachineEditData = z.infer<typeof machineEditSchema>;

interface MachineEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  machine: MachineWithClient | null;
  profiles: Profile[];
  onSuccess: () => void;
}

const MachineEditModal = ({ open, onOpenChange, machine, profiles, onSuccess }: MachineEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [uidAssignment, setUidAssignment] = useState<UIDAssignment | null>(null);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<MachineEditData | null>(null);
  const { toast } = useToast();
  const { currentUID, assignUID, refetch } = useMicrocontrollerUID(machine?.id);

  const form = useForm<MachineEditData>({
    resolver: zodResolver(machineEditSchema),
    defaultValues: {
      machine_id: '',
      name: '',
      location: '',
      machine_model: '',
      purchase_date: '',
      microcontroller_uid: '',
      client_id: '',
    },
  });

  const clientProfiles = profiles.filter(profile => profile.role === 'client');

  // Update form when machine or currentUID changes
  useEffect(() => {
    if (machine && open) {
      console.log('🔄 Updating form with machine data and currentUID:', currentUID);
      form.reset({
        machine_id: machine.machine_id,
        name: machine.name,
        location: machine.location || '',
        machine_model: machine.machine_model || 'no-model',
        purchase_date: machine.purchase_date ? machine.purchase_date.split('T')[0] : '',
        microcontroller_uid: currentUID || '',
        client_id: machine.client_id || 'no-assignment',
      });
    }
  }, [machine, open, currentUID, form]);

  const microcontrollerUid = form.watch('microcontroller_uid');

  // Check UID assignment when UID changes
  useEffect(() => {
    const normalizedInputUid = microcontrollerUid?.trim() || '';
    const normalizedCurrentUid = currentUID?.trim() || '';
    
    if (normalizedInputUid && normalizedInputUid !== normalizedCurrentUid) {
      console.log('🔍 Checking UID assignment for:', normalizedInputUid);
      const checkUid = async () => {
        const assignment = await fetchUidAssignment(normalizedInputUid);
        console.log('🔍 UID assignment result:', assignment);
        setUidAssignment(assignment);
      };
      checkUid();
    } else {
      setUidAssignment(null);
    }
  }, [microcontrollerUid, currentUID]);

  const onSubmit = async (data: MachineEditData) => {
    const normalizedUid = data.microcontroller_uid?.trim() || '';
    const normalizedCurrentUid = currentUID?.trim() || '';

    // Check if UID is being reassigned to another machine
    if (uidAssignment && normalizedUid !== normalizedCurrentUid) {
      console.log('⚠️ UID reassignment detected, showing confirmation dialog');
      setPendingFormData(data);
      setShowReassignDialog(true);
      return;
    }

    // Proceed normally if no reassignment needed
    await handleConfirmedSubmit(data);
  };

  const handleConfirmedSubmit = async (data: MachineEditData) => {
    if (!machine) return;

    try {
      setLoading(true);
      console.log('💾 Saving machine changes...');

      // Convert special values back to null for database
      const updateData = {
        machine_id: data.machine_id,
        name: data.name,
        location: data.location || null,
        machine_model: data.machine_model === 'no-model' ? null : data.machine_model,
        purchase_date: data.purchase_date || null,
        client_id: data.client_id === 'no-assignment' ? null : data.client_id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('machines')
        .update(updateData)
        .eq('id', machine.id);

      if (error) {
        console.error('❌ Error updating machine:', error);
        toast({
          title: 'Error',
          description: `Failed to update machine: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Machine updated successfully');

      // Handle microcontroller UID assignment
      const newUID = data.microcontroller_uid?.trim();
      const currentUIDTrimmed = currentUID?.trim();
      
      if (newUID && newUID !== currentUIDTrimmed) {
        try {
          console.log('🔗 Assigning new UID:', newUID);
          const reassignmentNote = uidAssignment 
            ? `Reassigned from machine ${uidAssignment.machine_name} (${uidAssignment.machine_id}) via machine edit`
            : 'UID updated via machine edit';
          
          await assignUID(newUID, reassignmentNote);
          
          // Update form immediately to reflect the change
          form.setValue('microcontroller_uid', newUID);
          
          console.log('✅ UID assigned successfully');
          toast({
            title: 'Success',
            description: 'Machine updated and microcontroller UID assigned successfully',
          });
        } catch (assignError: any) {
          console.error('❌ Error assigning microcontroller UID:', assignError);
          toast({
            title: 'Warning',
            description: `Machine updated but failed to assign microcontroller UID: ${assignError.message}`,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'Machine updated successfully',
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('❌ Error updating machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to update machine',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReassignment = async () => {
    if (pendingFormData) {
      await handleConfirmedSubmit(pendingFormData);
      setPendingFormData(null);
    }
  };

  if (!machine) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Machine</DialogTitle>
            <DialogDescription>
              Update machine information
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="machine_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="machine_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-model">No model specified</SelectItem>
                          <SelectItem value="Amphore">Amphore</SelectItem>
                          <SelectItem value="BoKs">BoKs</SelectItem>
                          <SelectItem value="Water Dispenser">Water Dispenser</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="microcontroller_uid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Microcontroller UID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    {uidAssignment && field.value?.trim() !== currentUID?.trim() && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Warning:</strong> This UID is currently assigned to machine{' '}
                          <strong>{uidAssignment.machine_name}</strong> ({uidAssignment.machine_id}).
                          Saving will reassign the UID to this machine.
                        </AlertDescription>
                      </Alert>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Client</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-assignment">No assignment</SelectItem>
                          {clientProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {uidAssignment && (
        <ReassignUIDConfirmDialog
          open={showReassignDialog}
          onOpenChange={setShowReassignDialog}
          onConfirm={handleConfirmReassignment}
          uid={microcontrollerUid || ''}
          currentAssignment={uidAssignment}
          targetMachineName={machine.name}
        />
      )}
    </>
  );
};

export default MachineEditModal;
