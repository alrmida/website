
// Hierarchical status aggregation utilities
// Consistent month names for UTC formatting
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface StatusPercentages {
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface DailyStatusPoint extends StatusPercentages {
  date: string;
}

export interface WeeklyStatusPoint extends StatusPercentages {
  week: string;
}

export interface MonthlyStatusPoint extends StatusPercentages {
  month: string;
}

export interface YearlyStatusPoint extends StatusPercentages {
  year: string;
}

// Utility to ensure percentages sum to 100%
const normalizePercentages = (percentages: StatusPercentages): StatusPercentages => {
  const total = percentages.producing + percentages.idle + percentages.fullWater + percentages.disconnected;
  
  if (total === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }
  
  if (total === 100) {
    return percentages;
  }
  
  // Proportionally adjust to sum to 100
  const factor = 100 / total;
  const result = {
    producing: Math.round(percentages.producing * factor),
    idle: Math.round(percentages.idle * factor),
    fullWater: Math.round(percentages.fullWater * factor),
    disconnected: Math.round(percentages.disconnected * factor)
  };
  
  // Handle rounding discrepancies
  const newTotal = result.producing + result.idle + result.fullWater + result.disconnected;
  const diff = 100 - newTotal;
  
  if (diff !== 0) {
    // Add difference to the largest component
    if (result.disconnected >= result.producing && result.disconnected >= result.idle && result.disconnected >= result.fullWater) {
      result.disconnected += diff;
    } else if (result.fullWater >= result.producing && result.fullWater >= result.idle) {
      result.fullWater += diff;
    } else if (result.producing >= result.idle) {
      result.producing += diff;
    } else {
      result.idle += diff;
    }
  }
  
  return result;
};

// Calculate average percentages from multiple status points
const calculateAveragePercentages = (statusPoints: StatusPercentages[]): StatusPercentages => {
  console.log('🧮 [AGGREGATION] Calculating average from', statusPoints.length, 'points:', statusPoints);
  
  if (statusPoints.length === 0) {
    return { producing: 0, idle: 0, fullWater: 0, disconnected: 100 };
  }
  
  const totals = statusPoints.reduce((acc, point) => ({
    producing: acc.producing + point.producing,
    idle: acc.idle + point.idle,
    fullWater: acc.fullWater + point.fullWater,
    disconnected: acc.disconnected + point.disconnected
  }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });
  
  const count = statusPoints.length;
  const averages = {
    producing: totals.producing / count,
    idle: totals.idle / count,
    fullWater: totals.fullWater / count,
    disconnected: totals.disconnected / count
  };
  
  console.log('📊 [AGGREGATION] Raw averages:', averages);
  
  const normalized = normalizePercentages({
    producing: Math.round(averages.producing),
    idle: Math.round(averages.idle),
    fullWater: Math.round(averages.fullWater),
    disconnected: Math.round(averages.disconnected)
  });
  
  console.log('✅ [AGGREGATION] Normalized result:', normalized);
  return normalized;
};

// Group daily status points by week (Sunday to Saturday)
export const aggregateDailyToWeekly = (dailyPoints: DailyStatusPoint[]): WeeklyStatusPoint[] => {
  console.log('📅 [WEEKLY AGGREGATION] Processing', dailyPoints.length, 'daily points');
  
  const weeklyGroups: Record<string, DailyStatusPoint[]> = {};
  
  dailyPoints.forEach(point => {
    const date = new Date(point.date + ', ' + new Date().getFullYear());
    // Get start of week (Sunday)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekKey = `${startOfWeek.getUTCDate().toString().padStart(2, '0')} ${MONTHS[startOfWeek.getUTCMonth()]}`;
    
    if (!weeklyGroups[weekKey]) {
      weeklyGroups[weekKey] = [];
    }
    weeklyGroups[weekKey].push(point);
  });
  
  console.log('📊 [WEEKLY AGGREGATION] Weekly groups:', Object.keys(weeklyGroups).map(key => ({
    week: key,
    dayCount: weeklyGroups[key].length,
    days: weeklyGroups[key].map(d => d.date)
  })));
  
  const weeklyPoints: WeeklyStatusPoint[] = [];
  
  for (const [weekKey, points] of Object.entries(weeklyGroups)) {
    const averages = calculateAveragePercentages(points);
    weeklyPoints.push({
      week: weekKey,
      ...averages
    });
  }
  
  // Sort by date
  weeklyPoints.sort((a, b) => {
    const dateA = new Date(a.week + ', ' + new Date().getFullYear());
    const dateB = new Date(b.week + ', ' + new Date().getFullYear());
    return dateA.getTime() - dateB.getTime();
  });
  
  console.log('✅ [WEEKLY AGGREGATION] Final weekly points:', weeklyPoints);
  return weeklyPoints;
};

// Group weekly status points by month
export const aggregateWeeklyToMonthly = (weeklyPoints: WeeklyStatusPoint[]): MonthlyStatusPoint[] => {
  console.log('📅 [MONTHLY AGGREGATION] Processing', weeklyPoints.length, 'weekly points');
  
  const monthlyGroups: Record<string, WeeklyStatusPoint[]> = {};
  
  weeklyPoints.forEach(point => {
    const date = new Date(point.week + ', ' + new Date().getFullYear());
    const monthKey = `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(point);
  });
  
  console.log('📊 [MONTHLY AGGREGATION] Monthly groups:', Object.keys(monthlyGroups).map(key => ({
    month: key,
    weekCount: monthlyGroups[key].length,
    weeks: monthlyGroups[key].map(w => w.week)
  })));
  
  const monthlyPoints: MonthlyStatusPoint[] = [];
  
  for (const [monthKey, points] of Object.entries(monthlyGroups)) {
    const averages = calculateAveragePercentages(points);
    monthlyPoints.push({
      month: monthKey,
      ...averages
    });
  }
  
  // Sort by date
  monthlyPoints.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });
  
  console.log('✅ [MONTHLY AGGREGATION] Final monthly points:', monthlyPoints);
  return monthlyPoints;
};

// Group monthly status points by year
export const aggregateMonthlyToYearly = (monthlyPoints: MonthlyStatusPoint[]): YearlyStatusPoint[] => {
  console.log('📅 [YEARLY AGGREGATION] Processing', monthlyPoints.length, 'monthly points');
  
  const yearlyGroups: Record<string, MonthlyStatusPoint[]> = {};
  
  monthlyPoints.forEach(point => {
    const date = new Date(point.month);
    const yearKey = date.getFullYear().toString();
    
    if (!yearlyGroups[yearKey]) {
      yearlyGroups[yearKey] = [];
    }
    yearlyGroups[yearKey].push(point);
  });
  
  console.log('📊 [YEARLY AGGREGATION] Yearly groups:', Object.keys(yearlyGroups).map(key => ({
    year: key,
    monthCount: yearlyGroups[key].length,
    months: yearlyGroups[key].map(m => m.month)
  })));
  
  const yearlyPoints: YearlyStatusPoint[] = [];
  
  for (const [yearKey, points] of Object.entries(yearlyGroups)) {
    const averages = calculateAveragePercentages(points);
    yearlyPoints.push({
      year: yearKey,
      ...averages
    });
  }
  
  // Sort by year
  yearlyPoints.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  
  console.log('✅ [YEARLY AGGREGATION] Final yearly points:', yearlyPoints);
  return yearlyPoints;
};

// Generate time period labels for fallback data
export const generateTimePeriodLabels = () => {
  const now = new Date();
  
  // Generate last 7 days
  const dailyLabels = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    return `${date.getUTCDate().toString().padStart(2, '0')} ${MONTHS[date.getUTCMonth()]}`;
  }).reverse();
  
  // Generate last 4 weeks
  const weeklyLabels = Array.from({ length: 4 }, (_, i) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (i * 7));
    const weekStart = new Date(date);
    const day = weekStart.getUTCDay();
    const diff = weekStart.getUTCDate() - day;
    weekStart.setUTCDate(diff);
    return `${weekStart.getUTCDate().toString().padStart(2, '0')} ${MONTHS[weekStart.getUTCMonth()]}`;
  }).reverse();
  
  // Generate last 3 months
  const monthlyLabels = Array.from({ length: 3 }, (_, i) => {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - i);
    return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }).reverse();
  
  // Generate last 2 years
  const yearlyLabels = Array.from({ length: 2 }, (_, i) => 
    (new Date().getFullYear() - i).toString()
  ).reverse();
  
  return { dailyLabels, weeklyLabels, monthlyLabels, yearlyLabels };
};
