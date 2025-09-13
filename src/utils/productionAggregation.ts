// Hierarchical production aggregation utilities
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ProductionPoint {
  date: string;
  production: number;
}

export interface WeeklyProductionPoint {
  week: string;
  production: number;
}

export interface MonthlyProductionPoint {
  month: string;
  production: number;
}

export interface YearlyProductionPoint {
  year: string;
  production: number;
}

// Group daily production points by week (Sunday to Saturday)
export const aggregateDailyToWeekly = (dailyPoints: ProductionPoint[]): WeeklyProductionPoint[] => {
  console.log('📅 [WEEKLY PRODUCTION] Processing', dailyPoints.length, 'daily points');
  
  const weeklyGroups: Record<string, ProductionPoint[]> = {};
  
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
  
  const weeklyPoints: WeeklyProductionPoint[] = [];
  
  for (const [weekKey, points] of Object.entries(weeklyGroups)) {
    const totalProduction = points.reduce((sum, point) => sum + point.production, 0);
    weeklyPoints.push({
      week: weekKey,
      production: Math.round(totalProduction * 10) / 10
    });
  }
  
  // Sort by date
  weeklyPoints.sort((a, b) => {
    const dateA = new Date(a.week + ', ' + new Date().getFullYear());
    const dateB = new Date(b.week + ', ' + new Date().getFullYear());
    return dateA.getTime() - dateB.getTime();
  });
  
  console.log('✅ [WEEKLY PRODUCTION] Final weekly points:', weeklyPoints);
  return weeklyPoints;
};

// Group weekly production points by month
export const aggregateWeeklyToMonthly = (weeklyPoints: WeeklyProductionPoint[]): MonthlyProductionPoint[] => {
  console.log('📅 [MONTHLY PRODUCTION] Processing', weeklyPoints.length, 'weekly points');
  
  const monthlyGroups: Record<string, WeeklyProductionPoint[]> = {};
  
  weeklyPoints.forEach(point => {
    const date = new Date(point.week + ', ' + new Date().getFullYear());
    const monthKey = `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
    
    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = [];
    }
    monthlyGroups[monthKey].push(point);
  });
  
  const monthlyPoints: MonthlyProductionPoint[] = [];
  
  for (const [monthKey, points] of Object.entries(monthlyGroups)) {
    const totalProduction = points.reduce((sum, point) => sum + point.production, 0);
    monthlyPoints.push({
      month: monthKey,
      production: Math.round(totalProduction * 10) / 10
    });
  }
  
  // Sort by date
  monthlyPoints.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });
  
  console.log('✅ [MONTHLY PRODUCTION] Final monthly points:', monthlyPoints);
  return monthlyPoints;
};

// Group monthly production points by year
export const aggregateMonthlyToYearly = (monthlyPoints: MonthlyProductionPoint[]): YearlyProductionPoint[] => {
  console.log('📅 [YEARLY PRODUCTION] Processing', monthlyPoints.length, 'monthly points');
  
  const yearlyGroups: Record<string, MonthlyProductionPoint[]> = {};
  
  monthlyPoints.forEach(point => {
    const date = new Date(point.month);
    const yearKey = date.getFullYear().toString();
    
    if (!yearlyGroups[yearKey]) {
      yearlyGroups[yearKey] = [];
    }
    yearlyGroups[yearKey].push(point);
  });
  
  const yearlyPoints: YearlyProductionPoint[] = [];
  
  for (const [yearKey, points] of Object.entries(yearlyGroups)) {
    const totalProduction = points.reduce((sum, point) => sum + point.production, 0);
    yearlyPoints.push({
      year: yearKey,
      production: Math.round(totalProduction * 10) / 10
    });
  }
  
  // Sort by year
  yearlyPoints.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  
  console.log('✅ [YEARLY PRODUCTION] Final yearly points:', yearlyPoints);
  return yearlyPoints;
};

// Generate time period labels for fallback data
export const generateTimePeriodLabels = () => {
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