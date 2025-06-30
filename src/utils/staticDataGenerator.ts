
// Generate varied static production data based on machine ID
export function getStaticProductionData(machineId: string | undefined, multiplier: number = 1) {
  // For all machines, return zero static data - we'll use live calculations instead
  return {
    daily: [
      { date: '28 May', production: 0 },
      { date: '29 May', production: 0 },
      { date: '30 May', production: 0 },
      { date: '31 May', production: 0 }
    ],
    monthly: [
      { month: 'Mar 2025', production: 0 },
      { month: 'Apr 2025', production: 0 },
      { month: 'May 2025', production: 0 }
    ]
  };
}

// Generate varied status data based on machine ID using KUMULUS format
export function getStaticStatusData(machineId: string | undefined) {
  // For all machines, return zero static data - we'll use live calculations instead
  return [
    { date: '25 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
    { date: '26 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
    { date: '27 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
    { date: '28 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
    { date: '29 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
    { date: '30 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 },
    { date: '31 May', producing: 0, idle: 0, fullWater: 0, disconnected: 0 }
  ];
}
