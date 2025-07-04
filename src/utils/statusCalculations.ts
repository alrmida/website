
// Simplified status calculation
export const calculateStatusPercentagesForDay = (records: any[]) => {
  if (records.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  let fullWaterCount = 0;
  let producingCount = 0;
  let idleCount = 0;

  records.forEach(record => {
    if (record.full_tank === true) {
      fullWaterCount++;
    } else if (record.producing_water === true || record.compressor_on === 1) {
      producingCount++;
    } else {
      idleCount++;
    }
  });

  const totalRecords = records.length;
  
  const result = {
    fullWater: Math.round((fullWaterCount / totalRecords) * 100) || 0,
    producing: Math.round((producingCount / totalRecords) * 100) || 0,
    idle: Math.round((idleCount / totalRecords) * 100) || 0,
    disconnected: 0
  };

  // Ensure percentages add up to 100%
  const totalPercentage = result.producing + result.idle + result.fullWater + result.disconnected;
  if (totalPercentage !== 100 && totalPercentage > 0) {
    const diff = 100 - totalPercentage;
    if (result.fullWater >= result.producing && result.fullWater >= result.idle) {
      result.fullWater += diff;
    } else if (result.producing >= result.idle) {
      result.producing += diff;
    } else {
      result.idle += diff;
    }
  }

  return result;
};
