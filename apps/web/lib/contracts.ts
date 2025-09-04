// Contracts for Yahuti Trade Engine
export interface KpiSummary {
  pnlToday: number;
  pnlMtd: number;
  bankroll: number;
  cashToTrust: number;
  flipsToday: number;
  avgProfitPerFlip: number;
  sellThroughHours: number;
  disputePct7d: number;
  refundPct30d: number;
}

export interface SystemStatus {
  hunter: 'green' | 'amber' | 'red';
  buyer: 'green' | 'amber' | 'red';
  merchant: 'green' | 'amber' | 'red';
  fulfillment: 'green' | 'amber' | 'red';
  collector: 'green' | 'amber' | 'red';
  reprice: 'green' | 'amber' | 'red';
  allocator: 'green' | 'amber' | 'red';
  brains: 'green' | 'amber' | 'red';
  governor: 'green' | 'amber' | 'red';
}

export interface GlobalControl {
  action: 'START' | 'PAUSE' | 'KILL';
}

// Mock data for development
export const mockKPIData: KpiSummary = {
  pnlToday: 1247.82,
  pnlMtd: 18943.21,
  bankroll: 45821.33,
  cashToTrust: 0,
  flipsToday: 47,
  avgProfitPerFlip: 26.55,
  sellThroughHours: 18.2,
  disputePct7d: 0.008,
  refundPct30d: 0.012,
};

export const mockSystemStatus: SystemStatus = {
  hunter: 'green',
  buyer: 'green', 
  merchant: 'green',
  fulfillment: 'green',
  collector: 'amber',
  reprice: 'green',
  allocator: 'green',
  brains: 'green',
  governor: 'green',
};