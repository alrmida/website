
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RawMachineData {
  id: string;
  machine_id: string;
  timestamp_utc: string;
  water_level_l: number | null;
  compressor_on: number | null;
  ambient_temp_c: number | null;
  ambient_rh_pct: number | null;
  refrigerant_temp_c: number | null;
  exhaust_temp_c: number | null;
  current_a: number | null;
  treating_water: boolean | null;
  serving_water: boolean | null;
  producing_water: boolean | null;
  full_tank: boolean | null;
  disinfecting: boolean | null;
  created_at: string;
}

interface RawDataManagementProps {
  loading: boolean;
  onRefresh: () => void;
}

const RawDataManagement = ({ loading, onRefresh }: RawDataManagementProps) => {
  const { toast } = useToast();
  const [rawData, setRawData] = useState<RawMachineData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchRawData();
  }, []);

  const fetchRawData = async () => {
    setDataLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('raw_machine_data')
        .select('*', { count: 'exact', head: true });

      setTotalCount(count || 0);

      // Get latest 100 records
      const { data, error } = await supabase
        .from('raw_machine_data')
        .select('*')
        .order('timestamp_utc', { ascending: false })
        .limit(100);

      if (error) throw error;
      setRawData(data || []);
    } catch (error: any) {
      console.error('Error fetching raw data:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch raw data: ${error.message}`,
        variant: 'destructive',
      });
    }
    setDataLoading(false);
  };

  const cleanupOldData = async () => {
    try {
      const { error } = await supabase
        .from('raw_machine_data')
        .delete()
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Old data cleaned up successfully',
      });
      
      fetchRawData();
    } catch (error: any) {
      console.error('Error cleaning up data:', error);
      toast({
        title: 'Error',
        description: `Failed to cleanup data: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getBooleanBadge = (value: boolean | null) => {
    if (value === null) return <Badge variant="secondary">N/A</Badge>;
    return (
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  };

  const formatNumber = (value: number | null, decimals: number = 1) => {
    if (value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Raw Machine Data</h3>
          <p className="text-sm text-muted-foreground">
            Total records: {totalCount} (showing latest 100)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchRawData}
            disabled={dataLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={cleanupOldData}
            disabled={dataLoading}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Old Data (7+ days)
          </Button>
        </div>
      </div>

      {dataLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2">Loading raw data...</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="min-w-[120px]">Machine ID</TableHead>
                  <TableHead className="min-w-[140px]">Timestamp</TableHead>
                  <TableHead className="min-w-[100px]">Water Level (L)</TableHead>
                  <TableHead className="min-w-[90px]">Compressor</TableHead>
                  <TableHead className="min-w-[110px]">Ambient Temp (°C)</TableHead>
                  <TableHead className="min-w-[110px]">Ambient RH (%)</TableHead>
                  <TableHead className="min-w-[120px]">Refrigerant Temp (°C)</TableHead>
                  <TableHead className="min-w-[110px]">Exhaust Temp (°C)</TableHead>
                  <TableHead className="min-w-[100px]">Current (A)</TableHead>
                  <TableHead className="min-w-[110px]">Treating Water</TableHead>
                  <TableHead className="min-w-[110px]">Serving Water</TableHead>
                  <TableHead className="min-w-[120px]">Producing Water</TableHead>
                  <TableHead className="min-w-[90px]">Full Tank</TableHead>
                  <TableHead className="min-w-[100px]">Disinfecting</TableHead>
                  <TableHead className="min-w-[140px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8">
                      No raw data found. The edge function may be having issues storing data.
                    </TableCell>
                  </TableRow>
                ) : (
                  rawData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.machine_id}</TableCell>
                      <TableCell className="text-xs">{formatTimestamp(record.timestamp_utc)}</TableCell>
                      <TableCell>{formatNumber(record.water_level_l)}</TableCell>
                      <TableCell>
                        <Badge variant={record.compressor_on ? "default" : "outline"}>
                          {record.compressor_on ? 'ON' : 'OFF'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(record.ambient_temp_c)}</TableCell>
                      <TableCell>{formatNumber(record.ambient_rh_pct)}</TableCell>
                      <TableCell>{formatNumber(record.refrigerant_temp_c)}</TableCell>
                      <TableCell>{formatNumber(record.exhaust_temp_c)}</TableCell>
                      <TableCell>{formatNumber(record.current_a, 0)}</TableCell>
                      <TableCell>{getBooleanBadge(record.treating_water)}</TableCell>
                      <TableCell>{getBooleanBadge(record.serving_water)}</TableCell>
                      <TableCell>{getBooleanBadge(record.producing_water)}</TableCell>
                      <TableCell>{getBooleanBadge(record.full_tank)}</TableCell>
                      <TableCell>{getBooleanBadge(record.disinfecting)}</TableCell>
                      <TableCell className="text-xs">{formatTimestamp(record.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default RawDataManagement;
