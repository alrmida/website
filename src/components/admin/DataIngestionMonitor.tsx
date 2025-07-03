
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Clock, XCircle, Activity } from 'lucide-react';

interface DataIngestionLog {
  id: string;
  machine_id: string;
  log_type: string;
  message: string;
  data_timestamp: string | null;
  data_freshness_minutes: number | null;
  influx_query: string | null;
  influx_response_size: number | null;
  error_details: string | null;
  created_at: string;
}

const DataIngestionMonitor = () => {
  const [logs, setLogs] = useState<DataIngestionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogType, setSelectedLogType] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('data_ingestion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedLogType !== 'all') {
        query = query.eq('log_type', selectedLogType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching ingestion logs:', error);
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedLogType]);

  const getLogIcon = (logType: string) => {
    switch (logType) {
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'EVENT':
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogBadgeVariant = (logType: string) => {
    switch (logType) {
      case 'SUCCESS':
        return 'default';
      case 'ERROR':
        return 'destructive';
      case 'WARNING':
        return 'secondary';
      case 'EVENT':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const logTypeCounts = logs.reduce((acc, log) => {
    acc[log.log_type] = (acc[log.log_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFreshness = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    if (minutes < 5) return `${minutes}m (Fresh)`;
    if (minutes < 30) return `${minutes}m (Recent)`;
    if (minutes < 120) return `${minutes}m (Old)`;
    return `${minutes}m (Stale)`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Ingestion Monitor</h2>
          <p className="text-muted-foreground">Monitor InfluxDB data flow and processing</p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{logTypeCounts.ERROR || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{logTypeCounts.WARNING || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{logTypeCounts.SUCCESS || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Log Filters and Display */}
      <Card>
        <CardHeader>
          <CardTitle>Ingestion Logs</CardTitle>
          <CardDescription>
            Recent data ingestion events and diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedLogType} onValueChange={setSelectedLogType}>
            <TabsList>
              <TabsTrigger value="all">All ({logs.length})</TabsTrigger>
              <TabsTrigger value="ERROR">Errors ({logTypeCounts.ERROR || 0})</TabsTrigger>
              <TabsTrigger value="WARNING">Warnings ({logTypeCounts.WARNING || 0})</TabsTrigger>
              <TabsTrigger value="SUCCESS">Success ({logTypeCounts.SUCCESS || 0})</TabsTrigger>
              <TabsTrigger value="EVENT">Events ({logTypeCounts.EVENT || 0})</TabsTrigger>
              <TabsTrigger value="INFO">Info ({logTypeCounts.INFO || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedLogType} className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {logs.map((log) => (
                    <Card key={log.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          {getLogIcon(log.log_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={getLogBadgeVariant(log.log_type)}>
                                {log.log_type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatTimestamp(log.created_at)}
                              </span>
                              {log.data_freshness_minutes !== null && (
                                <Badge variant="outline">
                                  {formatFreshness(log.data_freshness_minutes)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium">{log.message}</p>
                            {log.data_timestamp && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Data timestamp: {formatTimestamp(log.data_timestamp)}
                              </p>
                            )}
                            {log.influx_response_size && (
                              <p className="text-xs text-muted-foreground">
                                Response size: {log.influx_response_size} chars
                              </p>
                            )}
                            {log.error_details && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                                <strong>Error details:</strong> {log.error_details}
                              </div>
                            )}
                            {log.influx_query && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                  View InfluxDB Query
                                </summary>
                                <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                  {log.influx_query}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {logs.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      No logs found for the selected filter.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataIngestionMonitor;
