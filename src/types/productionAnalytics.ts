
export interface ProductionData {
  date: string;
  production: number;
}

export interface WeeklyProductionData {
  week: string;
  production: number;
}

export interface MonthlyProductionData {
  month: string;
  production: number;
}

export interface YearlyProductionData {
  year: string;
  production: number;
}

export interface StatusData {
  date: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface WeeklyStatusData {
  week: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface MonthlyStatusData {
  month: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface YearlyStatusData {
  year: string;
  producing: number;
  idle: number;
  fullWater: number;
  disconnected: number;
}

export interface ProductionAnalyticsData {
  dailyProductionData: ProductionData[];
  weeklyProductionData: WeeklyProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  yearlyProductionData: YearlyProductionData[];
  statusData: StatusData[];
  weeklyStatusData: WeeklyStatusData[];
  monthlyStatusData: MonthlyStatusData[];
  yearlyStatusData: YearlyStatusData[];
  totalAllTimeProduction: number;
}
