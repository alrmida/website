
// Generate varied static production data based on machine ID
export function getStaticProductionData(machineId: string | undefined, multiplier: number = 1) {
  const baseDaily = [
    { date: '28 May', production: 15.2 },
    { date: '29 May', production: 31.5 },
    { date: '30 May', production: 47.8 },
    { date: '31 May', production: 19.6 }
  ];

  const baseMonthly = [
    { month: 'Mar 2025', production: 1850 },
    { month: 'Apr 2025', production: 2250 },
    { month: 'May 2025', production: 1950 }
  ];

  return {
    daily: baseDaily.map(item => ({ ...item, production: item.production * multiplier })),
    monthly: baseMonthly.map(item => ({ ...item, production: item.production * multiplier }))
  };
}

// Generate varied status data based on machine ID
export function getStaticStatusData(machineId: string | undefined) {
  const variations: { [key: string]: any } = {
    'KU001': { producingMultiplier: 1.2, idleMultiplier: 0.5, disconnectedMultiplier: 0.2 },
    'KU002': { producingMultiplier: 0.9, idleMultiplier: 1.5, disconnectedMultiplier: 0.8 },
    'KU003': { producingMultiplier: 0.7, idleMultiplier: 2.0, disconnectedMultiplier: 1.5 },
    'KU004': { producingMultiplier: 0.3, idleMultiplier: 0.8, disconnectedMultiplier: 3.0 },
    'default': { producingMultiplier: 1.0, idleMultiplier: 1.0, disconnectedMultiplier: 1.0 }
  };

  const variation = variations[machineId || 'default'] || variations['default'];
  
  const baseStatusData = [
    { date: '25 May', producing: 19, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '26 May', producing: 18, idle: 2, fullWater: 1, disconnected: 3 },
    { date: '27 May', producing: 22, idle: 1, fullWater: 1, disconnected: 0 },
    { date: '28 May', producing: 19, idle: 2, fullWater: 2, disconnected: 1 },
    { date: '29 May', producing: 21, idle: 1, fullWater: 1, disconnected: 1 },
    { date: '30 May', producing: 12, idle: 6, fullWater: 3, disconnected: 3 },
    { date: '31 May', producing: 10, idle: 6, fullWater: 4, disconnected: 4 }
  ];

  return baseStatusData.map(day => ({
    ...day,
    producing: Math.round(day.producing * variation.producingMultiplier),
    idle: Math.round(day.idle * variation.idleMultiplier),
    disconnected: Math.round(day.disconnected * variation.disconnectedMultiplier)
  }));
}
