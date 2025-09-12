
// Enhanced status calculation with improved debugging and validation
export const calculateStatusPercentagesForDay = (records: any[]) => {
  console.log('🧮 [STATUS CALC] Starting calculation for', records.length, 'records');
  
  if (!records || records.length === 0) {
    console.log('⚠️ [STATUS CALC] No records provided - returning 100% disconnected');
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  // Enhanced validation of record structure
  const validRecords = records.filter(record => {
    const isValid = record && 
                   typeof record === 'object' &&
                   record.hasOwnProperty('full_tank') &&
                   record.hasOwnProperty('producing_water') &&
                   record.hasOwnProperty('compressor_on');
    
    if (!isValid) {
      console.warn('⚠️ [STATUS CALC] Invalid record structure:', record);
    }
    return isValid;
  });

  console.log('📊 [STATUS CALC] Record validation:', {
    totalRecords: records.length,
    validRecords: validRecords.length,
    invalidRecords: records.length - validRecords.length,
    sampleValidRecord: validRecords[0] || 'No valid records'
  });

  if (validRecords.length === 0) {
    console.warn('⚠️ [STATUS CALC] No valid records after validation - returning 100% disconnected');
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }

  let fullWaterCount = 0;
  let producingCount = 0;
  let idleCount = 0;

  // Process each valid record with detailed logging
  validRecords.forEach((record, index) => {
    const fullTank = record.full_tank === true || record.full_tank === 1;
    const producingWater = record.producing_water === true || record.producing_water === 1;
    const compressorOn = record.compressor_on === true || record.compressor_on === 1;
    
    if (index < 3) { // Log first 3 records for debugging
      console.log(`📋 [STATUS CALC] Record ${index + 1}:`, {
        raw: { 
          full_tank: record.full_tank, 
          producing_water: record.producing_water, 
          compressor_on: record.compressor_on 
        },
        processed: { fullTank, producingWater, compressorOn }
      });
    }

    if (fullTank) {
      fullWaterCount++;
    } else if (producingWater || compressorOn) {
      producingCount++;
    } else {
      idleCount++;
    }
  });

  const totalRecords = validRecords.length;
  
  const result = {
    fullWater: Math.round((fullWaterCount / totalRecords) * 100) || 0,
    producing: Math.round((producingCount / totalRecords) * 100) || 0,
    idle: Math.round((idleCount / totalRecords) * 100) || 0,
    disconnected: 0
  };

  console.log('📊 [STATUS CALC] Raw counts:', {
    totalRecords,
    fullWaterCount,
    producingCount,
    idleCount,
    rawPercentages: {
      fullWater: (fullWaterCount / totalRecords) * 100,
      producing: (producingCount / totalRecords) * 100,
      idle: (idleCount / totalRecords) * 100
    }
  });

  // Ensure percentages add up to 100%
  const totalPercentage = result.producing + result.idle + result.fullWater + result.disconnected;
  if (totalPercentage !== 100 && totalPercentage > 0) {
    const diff = 100 - totalPercentage;
    console.log('🔧 [STATUS CALC] Adjusting percentages by', diff, 'to reach 100%');
    
    if (result.fullWater >= result.producing && result.fullWater >= result.idle) {
      result.fullWater += diff;
    } else if (result.producing >= result.idle) {
      result.producing += diff;
    } else {
      result.idle += diff;
    }
  }

  console.log('✅ [STATUS CALC] Final result:', result);
  return result;
};
