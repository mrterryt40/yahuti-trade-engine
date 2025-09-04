// Mock contracts for standalone version
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