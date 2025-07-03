
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Database, Activity } from 'lucide-react';
import { toast } from 'sonner';

const DataFlowDiagnostics = () => {
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [lastDiagnostic, setLastDiagnostic] = useState<any>(null);
  const [recentSnapshots, setRecentSnapshots] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const runWaterProductionTracking = async () => {
    setIsRunningDiagnostics(true);
    try {
      console.log('🔧 Running manual water production tracking diagnostic...');
      
      const { data, error } = await supabase.functions.invoke('track-water-production', {
        body: { manual_trigger: true, diagnostic_mode: true }
      });

      if (error) {
        console.error('❌ Error running diagnostic:', error);
        toast.error(`Diagnostic failed: ${error.message}`);
      } else {
        console.log('✅ Diagnostic completed:', data);
        setLastDiagnostic({
          timestamp: new Date().toISOString(),
          result: data,
          success: true
        });
        toast.success('Diagnostic completed successfully');
        
        // Refresh data after diagnostic
        await fetchRecentData();
      }
    } catch (error) {
      console.error('💥 Unexpected error during diagnostic:', error);
      toast.error('Unexpected error during diagnostic');
      setLastDiagnostic({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const fetchRecentData = async () => {
    try {
      // Fetch recent snapshots
      const { data: snapshots } = await supabase
        .from('simple_water_snapshots')
        .select('*')
        .order('timestamp_utc', { ascending: false })
        .limit(10);

      // Fetch recent production events
      const { data: events } = await supabase
        .from('water_production_events')
        .select('*')
        .order('timestamp_utc', { ascending: false })
        .limit(10);

      setRecentSnapshots(snapshots || []);
      setRecentEvents(events || []);
    } catch (error) {
      console.error('Error fetching recent data:', error);
    }
  };

  useEffect(() => {
    fetchRecentData();
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDataFreshness = (timestamp: string) => {
    const age = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.round(age / 1000 / 60);
    
    if (minutes < 5) return { label: `${minutes}m ago`, variant: 'default', fresh: true };
    if (minutes < 30) return { label: `${minutes}m ago`, variant: 'secondary', fresh: true };
    if (minutes < 120) return { label: `${minutes}m ago`, variant: 'outline', fresh: false };
    return { label: `${minutes}m ago`, variant: 'destructive', fresh: false };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Flow Diagnostics</h2>
          <p className="text-muted-foreground">Test and monitor the complete data pipeline</p>
        </div>
        <Button 
          onClick={runWaterProductionTracking} 
          disabled={isRunningDiagnostics}
          className="flex items-center space-x-2"
        >
          <Activity className="h-4 w-4" />
          <span>{isRunningDiagnostics ? 'Running...' : 'Run Diagnostic'}</span>
        </Button>
      </div>

      {/* Diagnostic Results */}
      {lastDiagnostic && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {lastDiagnostic.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span>Last Diagnostic Result</span>
            </CardTitle>
            <CardDescription>
              Executed at {formatTimestamp(lastDiagnostic.timestamp)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastDiagnostic.success ? (
              <div className="space-y-2">
                <p><strong>Status:</strong> {lastDiagnostic.result?.status || 'Unknown'}</p>
                <p><strong>Message:</strong> {lastDiagnostic.result?.message || 'No message'}</p>
                {lastDiagnostic.result?.event_type && (
                  <p><strong>Event Type:</strong> {lastDiagnostic.result.event_type}</p>
                )}
                {lastDiagnostic.result?.production && (
                  <p><strong>Production:</strong> {lastDiagnostic.result.production}L</p>
                )}
                {lastDiagnostic.result?.water_removed && (
                  <p><strong>Water Removed:</strong> {lastDiagnostic.result.water_removed}L</p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                <p className="text-red-700 dark:text-red-300">
                  <strong>Error:</strong> {lastDiagnostic.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Snapshots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Recent Water Level Snapshots</span>
          </CardTitle>
          <CardDescription>Latest water level measurements stored in the database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSnapshots.length > 0 ? (
              recentSnapshots.map((snapshot) => {
                const freshness = getDataFreshness(snapshot.timestamp_utc);
                return (
                  <div key={snapshot.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{snapshot.water_level_l}L</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimestamp(snapshot.timestamp_utc)}
                      </p>
                    </div>
                    <Badge variant={freshness.variant as any}>
                      {freshness.label}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No recent snapshots found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Production Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Production Events</span>
          </CardTitle>
          <CardDescription>Latest water production and drainage events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => {
                const freshness = getDataFreshness(event.timestamp_utc);
                return (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={event.event_type === 'production' ? 'default' : 'secondary'}>
                          {event.event_type}
                        </Badge>
                        <span className="font-medium">{event.production_liters}L</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.previous_level}L → {event.current_level}L
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTimestamp(event.timestamp_utc)}
                      </p>
                    </div>
                    <Badge variant={freshness.variant as any}>
                      {freshness.label}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No recent production events found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataFlowDiagnostics;
