
import React from 'react';

interface DashboardNotificationsProps {
  selectedMachine: any;
  dataError: string | null;
  dataLoading: boolean;
}

const DashboardNotifications = ({ selectedMachine, dataError, dataLoading }: DashboardNotificationsProps) => {
  return (
    <>
      {/* Show softer message for live data machine when disconnected */}
      {dataError && selectedMachine?.machine_id === 'KU001619000079' && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded">
          <p><strong>Live Machine Status:</strong> No recent data received from the machine.</p>
          <p className="text-sm">This is normal when the machine is offline or not actively transmitting data.</p>
        </div>
      )}

      {/* Show loading indicator only for live data */}
      {dataLoading && selectedMachine?.machine_id === 'KU001619000079' && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p>Checking for live machine data...</p>
        </div>
      )}
    </>
  );
};

export default DashboardNotifications;
