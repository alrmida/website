
// Generate static production data based on machine ID (consistent, not random)
export function getStaticProductionData(machineId: string | undefined, multiplier: number = 1) {
  // Return consistent zero data for all machines - no random generation
  const today = new Date();
  
  return {
    daily: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        production: 0 // Always zero - no random data
      };
    }),
    monthly: Array.from({ length: 3 }, (_, i) => {
      const date = new Date(today);
      date.setMonth(date.getMonth() - (2 - i));
      return {
        month: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        production: 0 // Always zero - no random data
      };
    })
  };
}

// Generate static status data based on machine ID (consistent, not random)
export function getStaticStatusData(machineId: string | undefined) {
  // Return consistent zero data for all machines - no random generation
  const today = new Date();
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      producing: 0,
      idle: 0,
      fullWater: 0,
      disconnected: 0
    };
  });
}

// Generate static monthly status data
export function getStaticMonthlyStatusData(machineId: string | undefined) {
  const today = new Date();
  
  return Array.from({ length: 3 }, (_, i) => {
    const date = new Date(today);
    date.setMonth(date.getMonth() - (2 - i));
    const monthStr = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : `${date.getMonth() + 1}`;
    return {
      month: `${date.getFullYear()}-${monthStr}`,
      producing: 0,
      idle: 0,
      fullWater: 0,
      disconnected: 0
    };
  });
}
