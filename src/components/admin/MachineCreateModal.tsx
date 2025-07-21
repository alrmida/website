
import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './types';
import { isValidMachineId, isValidMicrocontrollerUID } from '@/types/machine';

const machineCreateSchema = z.object({
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

type MachineCreateData = z.infer<typeof machineCreateSchema>;

interface MachineCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: Profile[];
  onSuccess: () => void;
}

const MachineCreateModal = ({ open, onOpenChange, profiles, onSuccess }: MachineCreateModalProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<MachineCreateData>({
    resolver: zodResolver(machineCreateSchema),
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

  const onSubmit = async (data: MachineCreateData) => {
    try {
      setLoading(true);

      // First, create the machine without the microcontroller_uid
      const machineData = {
        machine_id: data.machine_id,
        name: data.name,
        location: data.location || null,
        machine_model: data.machine_model === 'none' ? null : data.machine_model || null,
        purchase_date: data.purchase_date || null,
        client_id: data.client_id === 'unassigned' ? null : data.client_id || null,
      };

      const { data: newMachine, error } = await supabase
        .from('machines')
        .insert([machineData])
        .select()
        .single();

      if (error) {
        console.error('Error creating machine:', error);
        toast({
          title: 'Error',
          description: `Failed to create machine: ${error.message}`,
          variant: 'destructive',
        });
        return;
      }

      // If a microcontroller UID is provided, assign it to the machine
      if (data.microcontroller_uid && data.microcontroller_uid.trim() !== '') {
        const { error: assignError } = await supabase.rpc('assign_microcontroller_uid', {
          p_machine_id: newMachine.id,
          p_microcontroller_uid: data.microcontroller_uid,
          p_notes: 'Initial assignment during machine creation'
        });

        if (assignError) {
          console.error('Error assigning microcontroller UID:', assignError);
          toast({
            title: 'Warning',
            description: `Machine created but failed to assign microcontroller UID: ${assignError.message}`,
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Success',
        description: 'Machine created successfully',
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to create machine',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Machine</DialogTitle>
          <DialogDescription>
            Add a new machine to the system
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
                    <Input placeholder="KU001619000001" {...field} />
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
                    <Input placeholder="Machine name" {...field} />
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
                    <Input placeholder="Machine location" {...field} />
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
                        <SelectItem value="none">No model specified</SelectItem>
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
                    <Input placeholder="24 hex characters" {...field} />
                  </FormControl>
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
                        <SelectItem value="unassigned">No assignment</SelectItem>
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
                {loading ? 'Creating...' : 'Create Machine'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MachineCreateModal;
