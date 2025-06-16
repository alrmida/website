
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Cog, RotateCcw } from 'lucide-react';
import { useRealTimeDataCollection } from '@/hooks/useRealTimeDataCollection';

const RealTimeDataTable = () => {
  const {
    collectedData,
    isProcessing,
    lastProcessedAt,
    startCollection,
    stopCollection,
    processBatch,
    dataCount,
    maxLines,
  } = useRealTimeDataCollection();

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatNumber = (value: number | null, decimals: number = 3) => {
    if (value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  const getProgressPercentage = () => {
    return (dataCount / maxLines) * 100;
  };

  const getRemainingTime = () => {
    const remainingLines = maxLines - dataCount;
    const remainingMinutes = Math.round((remainingLines * 10) / 60); // 10 seconds per line
    return remainingMinutes;
  };

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold">Real-Time Data Collection</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Collecting data points every 10 seconds. Auto-processes at {maxLines} lines (30 minutes).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={startCollection}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={stopCollection}
              disabled={isProcessing}
              variant="outline"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button
              onClick={processBatch}
              disabled={isProcessing || dataCount === 0}
              variant="default"
              size="sm"
            >
              <Cog className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Processing...' : 'Process Batch'}
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{dataCount} / {maxLines} data points</span>
            <span>~{getRemainingTime()} min remaining</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {lastProcessedAt && (
          <p className="text-xs text-gray-500 mt-2">
            Last processed: {lastProcessedAt.toLocaleString()}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {dataCount === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No data collected yet. Collection will start automatically.</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="min-w-[80px]">#</TableHead>
                    <TableHead className="min-w-[140px]">Timestamp</TableHead>
                    <TableHead className="min-w-[100px]">Water Level (L)</TableHead>
                    <TableHead className="min-w-[90px]">Collector LS1</TableHead>
                    <TableHead className="min-w-[90px]">Compressor</TableHead>
                    <TableHead className="min-w-[100px]">Ambient °C</TableHead>
                    <TableHead className="min-w-[100px]">Current (A)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectedData.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">
                        {String(index + 1).padStart(3, '0')}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatTimestamp(record.timestamp_utc)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(record.water_level_l)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.collector_ls1 === 0 ? "destructive" : "default"}>
                          {record.collector_ls1 === 0 ? 'PUMP' : 'IDLE'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.compressor_on ? "default" : "outline"}>
                          {record.compressor_on ? 'ON' : 'OFF'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(record.ambient_temp_c, 1)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatNumber(record.current_a, 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeDataTable;
