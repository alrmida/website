
import React from 'react';

interface DashboardNotificationsProps {
  selectedMachine: any;
  dataError: string | null;
  dataLoading: boolean;
}

const DashboardNotifications = ({ selectedMachine, dataError, dataLoading }: DashboardNotificationsProps) => {
  return (
    <>
      {/* Show data error only for live data machine (KU079) */}
      {dataError && selectedMachine?.machine_id === 'KU079' && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p><strong>Live Data Connection Error:</strong> {dataError}</p>
          <p className="text-sm">Unable to fetch live data from InfluxDB. Please check the connection.</p>
        </div>
      )}

      {/* Show loading indicator only for live data */}
      {dataLoading && selectedMachine?.machine_id === 'KU079' && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p>Loading live machine data...</p>
        </div>
      )}
    </>
  );
};

export default DashboardNotifications;
