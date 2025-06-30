
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Play, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WaterProductionDebugPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const triggerCalculation = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Manually triggering water production calculation...');
      
      const { data, error } = await supabase.functions.invoke('calculate-water-production', {
        body: { manual: true }
      });

      if (error) {
        console.error('❌ Error triggering calculation:', error);
        toast({
          title: "Error",
          description: `Failed to trigger calculation: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Calculation triggered successfully:', data);
      setLastResult(data);
      
      toast({
        title: "Success",
        description: "Water production calculation triggered successfully",
      });
      
    } catch (error) {
      console.error('💥 Exception triggering calculation:', error);
      toast({
        title: "Error",
        description: "Failed to trigger calculation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkRecentData = async () => {
    try {
      // Check recent snapshots
      const { data: snapshots, error: snapshotError } = await supabase
        .from('water_level_snapshots')
        .select('*')
        .eq('machine_id', 'KU001619000079')
        .order('timestamp_utc', { ascending: false })
        .limit(5);

      // Check recent production periods
      const { data: periods, error: periodError } = await supabase
        .from('water_production_periods')
        .select('*')
        .eq('machine_id', 'KU001619000079')
        .order('period_start', { ascending: false })
        .limit(5);

      if (snapshotError || periodError) {
        toast({
          title: "Error",
          description: "Failed to fetch recent data",
          variant: "destructive",
        });
        return;
      }

      console.log('📊 Recent snapshots:', snapshots);
      console.log('📊 Recent periods:', periods);

      toast({
        title: "Debug Info",
        description: `Found ${snapshots?.length || 0} snapshots and ${periods?.length || 0} periods`,
      });

    } catch (error) {
      console.error('Error checking recent data:', error);
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Water Production Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={triggerCalculation} 
            disabled={isLoading}
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Trigger Calculation
          </Button>
          
          <Button 
            onClick={checkRecentData} 
            variant="outline"
            size="sm"
          >
            Check Recent Data
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs font-medium mb-2">Last Result:</p>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• This panel allows manual testing of the water production calculation</p>
          <p>• Check the console logs for detailed debugging information</p>
          <p>• The calculation normally runs automatically every 30 minutes</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaterProductionDebugPanel;
