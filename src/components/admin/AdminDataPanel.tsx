
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataIngestionMonitor from './DataIngestionMonitor';
import { DataPipelineTest } from './DataPipelineTest';
import RawDataManagement from './RawDataManagement';
import { DataPipelineDiagnostics } from './DataPipelineDiagnostics';
import { PipelineRepair } from './PipelineRepair';
import { PipelineDiagnosticTool } from './PipelineDiagnosticTool';
import { EnhancedPipelineDiagnostic } from './EnhancedPipelineDiagnostic';
import { RoleBasedDataDebugger } from './RoleBasedDataDebugger';
import { MachineWithClient } from '@/types/machine';

interface AdminDataPanelProps {
  selectedMachine?: MachineWithClient;
}

export const AdminDataPanel = ({ selectedMachine }: AdminDataPanelProps) => {
  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="enhanced-diagnostics" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="enhanced-diagnostics">Enhanced Debug</TabsTrigger>
          <TabsTrigger value="role-debug">Role Debug</TabsTrigger>
          <TabsTrigger value="diagnostics">Pipeline Health</TabsTrigger>
          <TabsTrigger value="troubleshoot">Troubleshoot</TabsTrigger>
          <TabsTrigger value="repair">Pipeline Repair</TabsTrigger>
          <TabsTrigger value="monitor">Data Monitor</TabsTrigger>
          <TabsTrigger value="test">Pipeline Test</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="enhanced-diagnostics" className="space-y-4">
          <EnhancedPipelineDiagnostic />
        </TabsContent>
        
        <TabsContent value="role-debug" className="space-y-4">
          <RoleBasedDataDebugger />
        </TabsContent>
        
        <TabsContent value="diagnostics" className="space-y-4">
          <DataPipelineDiagnostics />
        </TabsContent>
        
        <TabsContent value="troubleshoot" className="space-y-4">
          <PipelineDiagnosticTool />
        </TabsContent>
        
        <TabsContent value="repair" className="space-y-4">
          <PipelineRepair />
        </TabsContent>
        
        <TabsContent value="monitor" className="space-y-4">
          <DataIngestionMonitor selectedMachine={selectedMachine} />
        </TabsContent>
        
        <TabsContent value="test" className="space-y-4">
          <DataPipelineTest selectedMachine={selectedMachine} />
        </TabsContent>
        
        <TabsContent value="raw" className="space-y-4">
          <RawDataManagement selectedMachine={selectedMachine} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
