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
import { MachineWithClient } from '@/types/machine';

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
  exhaust_rh_pct: number | null;
  current_a: number | null;
  treating_water: boolean | null;
  serving_water: boolean | null;
  producing_water: boolean | null;
  full_tank: boolean | null;
  disinfecting: boolean | null;
  collector_ls1: number | null;
  frost_identified: boolean | null;
  defrosting: boolean | null;
  eev_position: number | null;
  time_seconds: number | null;
  created_at: string;
}

interface RawDataManagementProps {
  selectedMachine?: MachineWithClient;
  onRefresh?: () => void;
}

const RawDataManagement = ({ selectedMachine, onRefresh }: RawDataManagementProps) => {
  const { toast } = useToast();
  const [rawData, setRawData] = useState<RawMachineData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchRawData();
  }, [selectedMachine]);

  const fetchRawData = async () => {
    setDataLoading(true);
    console.log('Fetching enhanced raw machine data...');
    
    try {
      // First, let's check our user profile and role
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      console.log('Current user profile:', profile);
      
      // Build query with optional machine filter
      let countQuery = supabase
        .from('raw_machine_data')
        .select('*', { count: 'exact', head: true });

      let dataQuery = supabase
        .from('raw_machine_data')
        .select('*')
        .order('timestamp_utc', { ascending: false })
        .limit(100);

      // Filter by selected machine if provided
      if (selectedMachine) {
        countQuery = countQuery.eq('machine_id', selectedMachine.machine_id);
        dataQuery = dataQuery.eq('machine_id', selectedMachine.machine_id);
      }

      // Get total count with error details
      const { count, error: countError } = await countQuery;

      console.log('Count query result:', { count, countError });
      
      if (countError) {
        console.error('Count error:', countError);
        setDebugInfo({ countError, profile });
      } else {
        setTotalCount(count || 0);
      }

      // Get latest 100 records with all new fields
      const { data, error } = await dataQuery;

      console.log('Enhanced data query result:', { data, error, dataLength: data?.length });

      if (error) {
        console.error('Data fetch error:', error);
        setDebugInfo({ error, profile, count });
        throw error;
      }
      
      setRawData(data || []);
      setDebugInfo({ success: true, profile, count, dataLength: data?.length, enhancedFields: true });
      
    } catch (error: any) {
      console.error('Error fetching enhanced raw data:', error);
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
      let deleteQuery = supabase
        .from('raw_machine_data')
        .delete()
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // If a specific machine is selected, only cleanup that machine's data
      if (selectedMachine) {
        deleteQuery = deleteQuery.eq('machine_id', selectedMachine.machine_id);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Old data cleaned up successfully',
      });
      
      fetchRawData();
      // Call parent refresh if provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error cleaning up data:', error);
      toast({
        title: 'Error',
        description: `Failed to cleanup data: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    fetchRawData();
    // Call parent refresh if provided
    if (onRefresh) {
      onRefresh();
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
          <h3 className="text-lg font-semibold">Enhanced Raw Machine Data</h3>
          <p className="text-sm text-muted-foreground">
            Total records: {totalCount} (showing latest 100) - Now includes all 18 sensor fields
            {selectedMachine && ` for ${selectedMachine.machine_id}`}
          </p>
          {debugInfo && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">Debug Info</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
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
          <p className="mt-2">Loading enhanced raw data...</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="min-w-[120px]">Machine ID</TableHead>
                  <TableHead className="min-w-[140px]">Timestamp</TableHead>
                  <TableHead className="min-w-[100px]">Time (sec)</TableHead>
                  <TableHead className="min-w-[100px]">Water Level (L)</TableHead>
                  <TableHead className="min-w-[90px]">Compressor</TableHead>
                  <TableHead className="min-w-[100px]">Current (A)</TableHead>
                  <TableHead className="min-w-[100px]">Collector LS1</TableHead>
                  <TableHead className="min-w-[110px]">Ambient Temp (°C)</TableHead>
                  <TableHead className="min-w-[110px]">Ambient RH (%)</TableHead>
                  <TableHead className="min-w-[120px]">Refrigerant Temp (°C)</TableHead>
                  <TableHead className="min-w-[110px]">Exhaust Temp (°C)</TableHead>
                  <TableHead className="min-w-[110px]">Exhaust RH (%)</TableHead>
                  <TableHead className="min-w-[90px]">EEV Position</TableHead>
                  <TableHead className="min-w-[110px]">Treating Water</TableHead>
                  <TableHead className="min-w-[110px]">Serving Water</TableHead>
                  <TableHead className="min-w-[120px]">Producing Water</TableHead>
                  <TableHead className="min-w-[90px]">Full Tank</TableHead>
                  <TableHead className="min-w-[100px]">Disinfecting</TableHead>
                  <TableHead className="min-w-[110px]">Frost Identified</TableHead>
                  <TableHead className="min-w-[100px]">Defrosting</TableHead>
                  <TableHead className="min-w-[140px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={21} className="text-center py-8">
                      No enhanced raw data found{selectedMachine ? ` for ${selectedMachine.machine_id}` : ''}. The edge function may be having issues storing data.
                    </TableCell>
                  </TableRow>
                ) : (
                  rawData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.machine_id}</TableCell>
                      <TableCell className="text-xs">{formatTimestamp(record.timestamp_utc)}</TableCell>
                      <TableCell>{formatNumber(record.time_seconds, 0)}</TableCell>
                      <TableCell>{formatNumber(record.water_level_l)}</TableCell>
                      <TableCell>
                        <Badge variant={record.compressor_on ? "default" : "outline"}>
                          {record.compressor_on ? 'ON' : 'OFF'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={record.current_a ? "text-green-600 font-medium" : "text-gray-400"}>
                          {formatNumber(record.current_a, 1)}A
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.collector_ls1 === 0 ? "destructive" : "default"}>
                          {record.collector_ls1 === 0 ? 'PUMP' : 'IDLE'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(record.ambient_temp_c)}</TableCell>
                      <TableCell>{formatNumber(record.ambient_rh_pct)}</TableCell>
                      <TableCell>{formatNumber(record.refrigerant_temp_c)}</TableCell>
                      <TableCell>{formatNumber(record.exhaust_temp_c)}</TableCell>
                      <TableCell>{formatNumber(record.exhaust_rh_pct)}</TableCell>
                      <TableCell>{record.eev_position || 'N/A'}</TableCell>
                      <TableCell>{getBooleanBadge(record.treating_water)}</TableCell>
                      <TableCell>{getBooleanBadge(record.serving_water)}</TableCell>
                      <TableCell>{getBooleanBadge(record.producing_water)}</TableCell>
                      <TableCell>{getBooleanBadge(record.full_tank)}</TableCell>
                      <TableCell>{getBooleanBadge(record.disinfecting)}</TableCell>
                      <TableCell>
                        <Badge variant={record.frost_identified ? "destructive" : "outline"}>
                          {record.frost_identified ? 'FROST' : 'CLEAR'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.defrosting ? "default" : "outline"}>
                          {record.defrosting ? 'ACTIVE' : 'OFF'}
                        </Badge>
                      </TableCell>
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
