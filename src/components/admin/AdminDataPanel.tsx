
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataIngestionMonitor from './DataIngestionMonitor';
import DataFlowDiagnostics from './DataFlowDiagnostics';
import { Database, Activity, BarChart3 } from 'lucide-react';

const AdminDataPanel = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Data Pipeline Administration</h1>
        <p className="text-muted-foreground">
          Monitor and diagnose the complete data flow from InfluxDB to Supabase
        </p>
      </div>

      <Tabs defaultValue="diagnostics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="diagnostics" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Flow Diagnostics</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Ingestion Logs</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="diagnostics" className="mt-6">
          <DataFlowDiagnostics />
        </TabsContent>
        
        <TabsContent value="logs" className="mt-6">
          <DataIngestionMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDataPanel;
