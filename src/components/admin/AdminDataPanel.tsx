
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataIngestionMonitor } from './DataIngestionMonitor';
import { DataFlowDiagnostics } from './DataFlowDiagnostics';
import { DataPipelineTest } from './DataPipelineTest';

export const AdminDataPanel = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Pipeline Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Monitor and test the data ingestion pipeline from InfluxDB to Supabase.
          </p>
        </CardContent>
      </Card>

      <DataPipelineTest />
      <DataIngestionMonitor />
      <DataFlowDiagnostics />
    </div>
  );
};
