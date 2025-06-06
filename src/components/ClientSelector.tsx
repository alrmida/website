
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Client {
  id: string;
  username: string;
}

interface ClientSelectorProps {
  clients: Client[];
  selectedClient: string;
  onClientSelect: (clientId: string) => void;
}

const ClientSelector = ({ clients, selectedClient, onClientSelect }: ClientSelectorProps) => {
  return (
    <div className="space-y-2">
      <Label>Select Client</Label>
      <Select value={selectedClient || undefined} onValueChange={onClientSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a client..." />
        </SelectTrigger>
        <SelectContent>
          {clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              {client.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ClientSelector;
