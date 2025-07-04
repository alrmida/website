
export interface ProductionData {
  date: string;
  production: number;
}

export interface MonthlyProductionData {
  month: string;
  production: number;
}

export interface StatusData {
  date: string;
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

export interface ProductionAnalyticsData {
  dailyProductionData: ProductionData[];
  monthlyProductionData: MonthlyProductionData[];
  statusData: StatusData[];
  monthlyStatusData: MonthlyStatusData[];
  totalAllTimeProduction: number;
}
