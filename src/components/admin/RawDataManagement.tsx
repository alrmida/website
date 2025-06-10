
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Water Level (L)</TableHead>
                <TableHead>Compressor</TableHead>
                <TableHead>Ambient Temp (°C)</TableHead>
                <TableHead>Ambient RH (%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rawData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No raw data found
                  </TableCell>
                </TableRow>
              ) : (
                rawData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.machine_id}</TableCell>
                    <TableCell>{formatTimestamp(record.timestamp_utc)}</TableCell>
                    <TableCell>
                      {record.water_level_l !== null ? record.water_level_l.toFixed(1) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.compressor_on !== null ? (record.compressor_on ? 'ON' : 'OFF') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.ambient_temp_c !== null ? record.ambient_temp_c.toFixed(1) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.ambient_rh_pct !== null ? record.ambient_rh_pct.toFixed(1) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {record.producing_water && getBooleanBadge(record.producing_water)}
                        {record.full_tank && getBooleanBadge(record.full_tank)}
                        {record.disinfecting && getBooleanBadge(record.disinfecting)}
                      </div>
                    </TableCell>
                    <TableCell>{formatTimestamp(record.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RawDataManagement;
