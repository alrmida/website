import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const ManualAggregationTrigger = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const triggerAggregation = async (mode: 'incremental' | 'backfill') => {
    setIsLoading(true);
    try {
      console.log(`🚀 Triggering ${mode} aggregation...`);
      
      const { data, error } = await supabase.functions.invoke('aggregate-production-data', {
        body: { mode }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Aggregation completed:', data);
      toast({
        title: "Aggregation Successful",
        description: `${mode === 'backfill' ? 'Full backfill' : 'Incremental update'} completed successfully.`,
      });
    } catch (error) {
      console.error('❌ Aggregation failed:', error);
      toast({
        title: "Aggregation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Data Aggregation</CardTitle>
        <CardDescription>
          Manually trigger production data aggregation to populate summary tables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button
            onClick={() => triggerAggregation('backfill')}
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Full Backfill
          </Button>
          <Button
            onClick={() => triggerAggregation('incremental')}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Incremental Update
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Backfill:</strong> Processes all historical data<br />
          <strong>Incremental:</strong> Processes only recent data
        </p>
      </CardContent>
    </Card>
  );
};