
import React from 'react';

interface DashboardNotificationsProps {
  selectedMachine: any;
  dataError: string | null;
  dataLoading: boolean;
  liveData?: any;
}

const DashboardNotifications = ({ selectedMachine, dataError, dataLoading, liveData }: DashboardNotificationsProps) => {
  const formatTimeSince = (timestamp: string) => {
    const now = new Date();
    const lastConnection = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - lastConnection.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Only show notifications if we have a selected machine with live data capability
  if (!selectedMachine?.microcontroller_uid) {
    return null;
  }

  return (
    <>
      {/* Show softer message for live data machine when disconnected */}
      {dataError && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded">
          <p><strong>Live Machine Status:</strong> No recent data received from the machine.</p>
          {liveData?.lastConnection && (
            <p className="text-sm mt-1">Last connection: {formatTimeSince(liveData.lastConnection)}</p>
          )}
        </div>
      )}

      {/* Show disconnection message with last connection time */}
      {liveData?.status === 'Disconnected' && !dataError && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded">
          <p><strong>Machine Disconnected:</strong> No recent data from the machine.</p>
          {liveData?.lastConnection && (
            <p className="text-sm mt-1">Last connection: {formatTimeSince(liveData.lastConnection)}</p>
          )}
        </div>
      )}

      {/* Show loading indicator only for live data */}
      {dataLoading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <p>Checking for live machine data...</p>
        </div>
      )}
    </>
  );
};

export default DashboardNotifications;
