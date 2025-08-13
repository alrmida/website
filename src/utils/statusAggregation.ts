
// Utility functions for hierarchical status aggregation
export interface StatusPercentages {
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface DailyStatusData extends StatusPercentages {
  date: string;
}

export interface WeeklyStatusData extends StatusPercentages {
  week: string;
}

export interface MonthlyStatusData extends StatusPercentages {
  month: string;
}

export interface YearlyStatusData extends StatusPercentages {
  year: string;
}

// Aggregate daily status data into weekly percentages
export const aggregateWeeklyFromDaily = (dailyData: DailyStatusData[]): WeeklyStatusData[] => {
  console.log('🔄 [STATUS AGGREGATION] Aggregating weekly from daily data:', {
    dailyDataPoints: dailyData.length,
    sampleDaily: dailyData[0] || 'No daily data'
  });

  if (dailyData.length === 0) {
    console.warn('⚠️ [STATUS AGGREGATION] No daily data for weekly aggregation');
    return [];
  }

  // Group daily data by week
  const weekGroups: Record<string, DailyStatusData[]> = {};
  
  dailyData.forEach(day => {
    // Parse the date and find the start of the week (Sunday)
    const dayDate = new Date(day.date);
    if (isNaN(dayDate.getTime())) {
      // If date parsing fails, try to parse as display format
      const parts = day.date.split(' ');
      if (parts.length === 2) {
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[parts[0]];
        const dayNum = parseInt(parts[1]);
        const currentYear = new Date().getFullYear();
        dayDate.setFullYear(currentYear, month, dayNum);
      }
    }
    
    if (isNaN(dayDate.getTime())) {
      console.warn('⚠️ [STATUS AGGREGATION] Invalid date format:', day.date);
      return;
    }

    const startOfWeek = new Date(dayDate);
    startOfWeek.setDate(dayDate.getDate() - dayDate.getDay());
    const weekKey = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!weekGroups[weekKey]) {
      weekGroups[weekKey] = [];
    }
    weekGroups[weekKey].push(day);
  });

  // Calculate weekly averages
  const weeklyData: WeeklyStatusData[] = [];
  
  Object.entries(weekGroups).forEach(([weekKey, days]) => {
    console.log(`📊 [STATUS AGGREGATION] Processing week ${weekKey} with ${days.length} days`);
    
    // Calculate weighted averages for the week
    const totalDays = days.length;
    const weeklyTotals = days.reduce((acc, day) => ({
      producing: acc.producing + day.producing,
      idle: acc.idle + day.idle,
      fullWater: acc.fullWater + day.fullWater,
      disconnected: acc.disconnected + day.disconnected
    }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });

    const weeklyPercentages = {
      producing: Math.round(weeklyTotals.producing / totalDays),
      idle: Math.round(weeklyTotals.idle / totalDays),
      fullWater: Math.round(weeklyTotals.fullWater / totalDays),
      disconnected: Math.round(weeklyTotals.disconnected / totalDays)
    };

    // Ensure percentages add up to 100%
    const total = weeklyPercentages.producing + weeklyPercentages.idle + 
                  weeklyPercentages.fullWater + weeklyPercentages.disconnected;
    
    if (total !== 100 && total > 0) {
      const diff = 100 - total;
      // Add the difference to the largest value
      const maxKey = Object.keys(weeklyPercentages).reduce((a, b) => 
        weeklyPercentages[a as keyof typeof weeklyPercentages] > 
        weeklyPercentages[b as keyof typeof weeklyPercentages] ? a : b
      ) as keyof typeof weeklyPercentages;
      weeklyPercentages[maxKey] += diff;
    }

    console.log(`✅ [STATUS AGGREGATION] Week ${weekKey} aggregated:`, {
      daysIncluded: totalDays,
      rawTotals: weeklyTotals,
      finalPercentages: weeklyPercentages
    });

    weeklyData.push({
      week: weekKey,
      ...weeklyPercentages
    });
  });

  return weeklyData.sort((a, b) => {
    // Sort by week start date
    const dateA = new Date(a.week + ', ' + new Date().getFullYear());
    const dateB = new Date(b.week + ', ' + new Date().getFullYear());
    return dateA.getTime() - dateB.getTime();
  });
};

// Aggregate weekly status data into monthly percentages
export const aggregateMonthlyFromWeekly = (weeklyData: WeeklyStatusData[]): MonthlyStatusData[] => {
  console.log('🔄 [STATUS AGGREGATION] Aggregating monthly from weekly data:', {
    weeklyDataPoints: weeklyData.length,
    sampleWeekly: weeklyData[0] || 'No weekly data'
  });

  if (weeklyData.length === 0) {
    console.warn('⚠️ [STATUS AGGREGATION] No weekly data for monthly aggregation');
    return [];
  }

  // Group weekly data by month
  const monthGroups: Record<string, WeeklyStatusData[]> = {};
  
  weeklyData.forEach(week => {
    // Parse week date to determine month
    const weekDate = new Date(week.week + ', ' + new Date().getFullYear());
    if (isNaN(weekDate.getTime())) {
      console.warn('⚠️ [STATUS AGGREGATION] Invalid week format:', week.week);
      return;
    }

    const monthKey = weekDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (!monthGroups[monthKey]) {
      monthGroups[monthKey] = [];
    }
    monthGroups[monthKey].push(week);
  });

  // Calculate monthly averages
  const monthlyData: MonthlyStatusData[] = [];
  
  Object.entries(monthGroups).forEach(([monthKey, weeks]) => {
    console.log(`📊 [STATUS AGGREGATION] Processing month ${monthKey} with ${weeks.length} weeks`);
    
    const totalWeeks = weeks.length;
    const monthlyTotals = weeks.reduce((acc, week) => ({
      producing: acc.producing + week.producing,
      idle: acc.idle + week.idle,
      fullWater: acc.fullWater + week.fullWater,
      disconnected: acc.disconnected + week.disconnected
    }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });

    const monthlyPercentages = {
      producing: Math.round(monthlyTotals.producing / totalWeeks),
      idle: Math.round(monthlyTotals.idle / totalWeeks),
      fullWater: Math.round(monthlyTotals.fullWater / totalWeeks),
      disconnected: Math.round(monthlyTotals.disconnected / totalWeeks)
    };

    // Ensure percentages add up to 100%
    const total = monthlyPercentages.producing + monthlyPercentages.idle + 
                  monthlyPercentages.fullWater + monthlyPercentages.disconnected;
    
    if (total !== 100 && total > 0) {
      const diff = 100 - total;
      const maxKey = Object.keys(monthlyPercentages).reduce((a, b) => 
        monthlyPercentages[a as keyof typeof monthlyPercentages] > 
        monthlyPercentages[b as keyof typeof monthlyPercentages] ? a : b
      ) as keyof typeof monthlyPercentages;
      monthlyPercentages[maxKey] += diff;
    }

    console.log(`✅ [STATUS AGGREGATION] Month ${monthKey} aggregated:`, {
      weeksIncluded: totalWeeks,
      rawTotals: monthlyTotals,
      finalPercentages: monthlyPercentages
    });

    monthlyData.push({
      month: monthKey,
      ...monthlyPercentages
    });
  });

  return monthlyData.sort((a, b) => {
    const dateA = new Date(a.month);
    const dateB = new Date(b.month);
    return dateA.getTime() - dateB.getTime();
  });
};

// Aggregate monthly status data into yearly percentages
export const aggregateYearlyFromMonthly = (monthlyData: MonthlyStatusData[]): YearlyStatusData[] => {
  console.log('🔄 [STATUS AGGREGATION] Aggregating yearly from monthly data:', {
    monthlyDataPoints: monthlyData.length,
    sampleMonthly: monthlyData[0] || 'No monthly data'
  });

  if (monthlyData.length === 0) {
    console.warn('⚠️ [STATUS AGGREGATION] No monthly data for yearly aggregation');
    return [];
  }

  // Group monthly data by year
  const yearGroups: Record<string, MonthlyStatusData[]> = {};
  
  monthlyData.forEach(month => {
    const monthDate = new Date(month.month);
    if (isNaN(monthDate.getTime())) {
      console.warn('⚠️ [STATUS AGGREGATION] Invalid month format:', month.month);
      return;
    }

    const yearKey = monthDate.getFullYear().toString();
    
    if (!yearGroups[yearKey]) {
      yearGroups[yearKey] = [];
    }
    yearGroups[yearKey].push(month);
  });

  // Calculate yearly averages
  const yearlyData: YearlyStatusData[] = [];
  
  Object.entries(yearGroups).forEach(([yearKey, months]) => {
    console.log(`📊 [STATUS AGGREGATION] Processing year ${yearKey} with ${months.length} months`);
    
    const totalMonths = months.length;
    const yearlyTotals = months.reduce((acc, month) => ({
      producing: acc.producing + month.producing,
      idle: acc.idle + month.idle,
      fullWater: acc.fullWater + month.fullWater,
      disconnected: acc.disconnected + month.disconnected
    }), { producing: 0, idle: 0, fullWater: 0, disconnected: 0 });

    const yearlyPercentages = {
      producing: Math.round(yearlyTotals.producing / totalMonths),
      idle: Math.round(yearlyTotals.idle / totalMonths),
      fullWater: Math.round(yearlyTotals.fullWater / totalMonths),
      disconnected: Math.round(yearlyTotals.disconnected / totalMonths)
    };

    // Ensure percentages add up to 100%
    const total = yearlyPercentages.producing + yearlyPercentages.idle + 
                  yearlyPercentages.fullWater + yearlyPercentages.disconnected;
    
    if (total !== 100 && total > 0) {
      const diff = 100 - total;
      const maxKey = Object.keys(yearlyPercentages).reduce((a, b) => 
        yearlyPercentages[a as keyof typeof yearlyPercentages] > 
        yearlyPercentages[b as keyof typeof yearlyPercentages] ? a : b
      ) as keyof typeof yearlyPercentages;
      yearlyPercentages[maxKey] += diff;
    }

    console.log(`✅ [STATUS AGGREGATION] Year ${yearKey} aggregated:`, {
      monthsIncluded: totalMonths,
      rawTotals: yearlyTotals,
      finalPercentages: yearlyPercentages
    });

    yearlyData.push({
      year: yearKey,
      ...yearlyPercentages
    });
  });

  return yearlyData.sort((a, b) => parseInt(a.year) - parseInt(b.year));
};
