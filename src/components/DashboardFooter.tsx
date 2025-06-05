
import React from 'react';

interface DashboardFooterProps {
  profile: any;
  selectedMachine: any;
  liveData: any;
}

const DashboardFooter = ({ profile, selectedMachine, liveData }: DashboardFooterProps) => {
  return (
    <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
      © 2025 Kumulus Water • Last updated: {selectedMachine && liveData.lastUpdated ? new Date(liveData.lastUpdated).toLocaleString() : '2025-06-01 07:39'}
      {profile && (
        <span className="ml-4">
          Logged in as: {profile.username} ({profile.role})
        </span>
      )}
      {selectedMachine && (
        <span className="ml-4 text-xs">
          {selectedMachine.machine_id === 'KU001619000079' ? 
            `Data age: ${Math.round(liveData.dataAge / 1000)}s • Compressor: ${liveData.compressorOn ? 'ON' : 'OFF'}` :
            'Static Demo Data'
          }
        </span>
      )}
    </div>
  );
};

export default DashboardFooter;
