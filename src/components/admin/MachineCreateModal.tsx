
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './types';
import { isValidMicrocontrollerUID } from '@/types/machine';
import { 
  MACHINE_MODELS, 
  generateMachineId, 
  checkMachineNumberExists, 
  getNextAvailableMachineNumber,
  validateMachineNumber 
} from '@/utils/machineNumberHelpers';

const machineCreateSchema = z.object({
  model: z.string().min(1, 'Model is required'),
  machineNumber: z.number().min(1, 'Machine number is required'),
  name: z.string().min(1, 'Name is required'),
  location: z.string().optional(),
  purchase_date: z.string().optional(),
  microcontroller_uid: z.string().min(1, 'Microcontroller UID is required').refine(isValidMicrocontrollerUID, {
    message: 'Microcontroller UID must be 24 hexadecimal characters',
  }),
  client_id: z.string().optional(), // Made optional
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
  const [generatedMachineId, setGeneratedMachineId] = useState<string>('');
  const [machineNumberExists, setMachineNumberExists] = useState(false);
  const [suggestedNumber, setSuggestedNumber] = useState<number>(1);
  const { toast } = useToast();

  const form = useForm<MachineCreateData>({
    resolver: zodResolver(machineCreateSchema),
    defaultValues: {
      model: '',
      machineNumber: 1,
      name: '',
      location: '',
      purchase_date: '',
      microcontroller_uid: '',
      client_id: 'no-assignment',
    },
  });

  const clientProfiles = profiles.filter(profile => profile.role === 'client');
  const selectedModel = form.watch('model');
  const machineNumber = form.watch('machineNumber');

  // Generate machine ID when model or number changes
  useEffect(() => {
    if (selectedModel && machineNumber) {
      try {
        const machineId = generateMachineId(selectedModel, machineNumber);
        setGeneratedMachineId(machineId);
      } catch (error) {
        setGeneratedMachineId('');
      }
    } else {
      setGeneratedMachineId('');
    }
  }, [selectedModel, machineNumber]);

  // Check if machine number exists and suggest next available
  useEffect(() => {
    if (selectedModel && machineNumber) {
      const checkExists = async () => {
        const exists = await checkMachineNumberExists(selectedModel, machineNumber);
        setMachineNumberExists(exists);
      };
      checkExists();
    }
  }, [selectedModel, machineNumber]);

  // Get suggested next number when model changes
  useEffect(() => {
    if (selectedModel) {
      const getSuggested = async () => {
        try {
          const nextNumber = await getNextAvailableMachineNumber(selectedModel);
          setSuggestedNumber(nextNumber);
          form.setValue('machineNumber', nextNumber);
        } catch (error) {
          console.error('Error getting next available number:', error);
        }
      };
      getSuggested();
    }
  }, [selectedModel, form]);

  const onSubmit = async (data: MachineCreateData) => {
    try {
      setLoading(true);

      // Validate machine number
      const validation = validateMachineNumber(data.machineNumber);
      if (!validation.isValid) {
        toast({
          title: 'Error',
          description: validation.error,
          variant: 'destructive',
        });
        return;
      }

      // Check if machine number is already taken
      const exists = await checkMachineNumberExists(data.model, data.machineNumber);
      if (exists) {
        toast({
          title: 'Error',
          description: 'This machine number is already taken for the selected model',
          variant: 'destructive',
        });
        return;
      }

      // Generate final machine ID
      const machineId = generateMachineId(data.model, data.machineNumber);

      // Create the machine with optional client assignment
      const machineData = {
        machine_id: machineId,
        name: data.name,
        location: data.location || null,
        machine_model: data.model,
        purchase_date: data.purchase_date || null,
        client_id: data.client_id === 'no-assignment' ? null : data.client_id,
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

      // Assign microcontroller UID
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
      } else {
        const assignmentMessage = data.client_id === 'no-assignment' 
          ? 'Machine created successfully. Available for client assignment.' 
          : 'Machine created successfully and assigned to client. Live data connection established.';
        
        toast({
          title: 'Success',
          description: assignmentMessage,
        });
      }

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
            Select model and machine number to generate the Kumulus ID automatically. Client assignment is optional.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Client</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select client (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-assignment">No assignment (available for later assignment)</SelectItem>
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

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {MACHINE_MODELS.map((model) => (
                          <SelectItem key={model.code} value={model.name}>
                            {model.name} ({model.prefix}XXXXXX)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="machineNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine Number</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="97"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        min="1"
                        max="999999"
                      />
                      {selectedModel && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => form.setValue('machineNumber', suggestedNumber)}
                        >
                          Use {suggestedNumber}
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  {machineNumberExists && (
                    <p className="text-sm text-red-600">
                      This number is already taken. Suggested: {suggestedNumber}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {generatedMachineId && (
              <div className="p-3 bg-gray-50 rounded-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generated Machine ID
                </label>
                <div className="flex items-center space-x-2">
                  <code className="text-lg font-mono font-bold">{generatedMachineId}</code>
                  <Badge variant={machineNumberExists ? 'destructive' : 'default'}>
                    {machineNumberExists ? 'Already exists' : 'Available'}
                  </Badge>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine Name</FormLabel>
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
                  <FormLabel>Microcontroller UID *</FormLabel>
                  <FormControl>
                    <Input placeholder="24 hex characters (required for live data)" {...field} />
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
              <Button 
                type="submit" 
                disabled={loading || machineNumberExists || !generatedMachineId}
              >
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
