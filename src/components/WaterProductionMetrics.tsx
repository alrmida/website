
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRealTimeDataCollection } from '@/hooks/useRealTimeDataCollection';
import { RealTimeDataTable } from './RealTimeDataTable';
import { MachineWithClient } from '@/types/machine';

interface WaterProductionMetricsProps {
  selectedMachine?: MachineWithClient;
}

export const WaterProductionMetrics = ({ selectedMachine }: WaterProductionMetricsProps) => {
  const {
    collectedData,
    isProcessing,
    isCollecting,
    lastProcessedAt,
    startCollection,
    stopCollection,
    processBatch,
    dataCount,
    maxLines,
  } = useRealTimeDataCollection(selectedMachine?.machine_id);

  if (!selectedMachine) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Production Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Please select a machine to view production metrics.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Real-Time Water Production Collection</CardTitle>
          <p className="text-sm text-gray-600">
            Machine: {selectedMachine.machine_id} | Collecting enhanced sensor data with pump event detection
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Collection Status</p>
                <p className="font-semibold">{isCollecting ? '🟢 Active' : '🔴 Stopped'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data Points</p>
                <p className="font-semibold">{dataCount}/{maxLines}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Processing Status</p>
                <p className="font-semibold">{isProcessing ? '⚡ Processing...' : '✅ Ready'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Processed</p>
                <p className="font-semibold">
                  {lastProcessedAt ? lastProcessedAt.toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={isCollecting ? stopCollection : startCollection}
                variant={isCollecting ? "destructive" : "default"}
                disabled={isProcessing}
              >
                {isCollecting ? 'Stop Collection' : 'Start Collection'}
              </Button>
              
              <Button
                onClick={processBatch}
                disabled={dataCount === 0 || isProcessing}
                variant="outline"
              >
                Process Batch ({dataCount})
              </Button>
            </div>
          </div>

          {dataCount >= maxLines && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                ⚠️ Collection buffer is full ({maxLines} points). 
                The system will auto-process when full, or you can manually process now.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {collectedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Collected Data Preview</CardTitle>
            <p className="text-sm text-gray-600">
              Latest {Math.min(collectedData.length, 20)} enhanced data points with additional sensor context
            </p>
          </CardHeader>
          <CardContent>
            <RealTimeDataTable data={collectedData.slice(0, 20)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
