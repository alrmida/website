
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const DataPipelineTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testTrackWaterProduction = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('🧪 Testing track-water-production function...');
      
      const { data, error } = await supabase.functions.invoke('track-water-production', {
        body: { manual_test: true }
      });

      if (error) {
        console.error('❌ Function error:', error);
        toast.error(`Function failed: ${error.message}`);
        setResults({ error: error.message, timestamp: new Date().toISOString() });
        return;
      }

      console.log('✅ Function response:', data);
      toast.success('Function executed successfully!');
      setResults({ 
        success: true, 
        data, 
        timestamp: new Date().toISOString() 
      });

      // Check if new data was added to simple_water_snapshots
      const { data: snapshots, error: snapshotError } = await supabase
        .from('simple_water_snapshots')
        .select('*')
        .eq('machine_id', 'KU001619000079')
        .order('timestamp_utc', { ascending: false })
        .limit(5);

      if (!snapshotError && snapshots) {
        setResults(prev => ({
          ...prev,
          latestSnapshots: snapshots
        }));
      }

    } catch (error) {
      console.error('💥 Test error:', error);
      toast.error('Test failed');
      setResults({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString() 
      });
    } finally {
      setTesting(false);
    }
  };

  const checkDataFreshness = async () => {
    try {
      // Check simple_water_snapshots
      const { data: snapshots } = await supabase
        .from('simple_water_snapshots')
        .select('*')
        .eq('machine_id', 'KU001619000079')
        .order('timestamp_utc', { ascending: false })
        .limit(1);

      // Check raw_machine_data
      const { data: rawData } = await supabase
        .from('raw_machine_data')
        .select('*')
        .eq('machine_id', '353636343034510C003F0046')
        .order('timestamp_utc', { ascending: false })
        .limit(1);

      const now = new Date();
      const snapshotAge = snapshots?.[0] ? 
        Math.round((now.getTime() - new Date(snapshots[0].timestamp_utc).getTime()) / 1000 / 60) : 
        null;
      const rawDataAge = rawData?.[0] ? 
        Math.round((now.getTime() - new Date(rawData[0].timestamp_utc).getTime()) / 1000 / 60) : 
        null;

      setResults({
        freshness: {
          latestSnapshot: snapshots?.[0],
          snapshotAgeMinutes: snapshotAge,
          latestRawData: rawData?.[0],
          rawDataAgeMinutes: rawDataAge,
          timestamp: new Date().toISOString()
        }
      });

      toast.success('Data freshness checked');
    } catch (error) {
      console.error('Error checking data freshness:', error);
      toast.error('Failed to check data freshness');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Data Pipeline Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testTrackWaterProduction}
            disabled={testing}
            variant="default"
          >
            {testing ? 'Testing...' : 'Test Water Production Function'}
          </Button>
          
          <Button 
            onClick={checkDataFreshness}
            variant="outline"
          >
            Check Data Freshness
          </Button>
        </div>

        {results && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
