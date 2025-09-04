import { Job } from 'bullmq';
import { prisma, AlertSeverity, InventoryKind, Marketplace, TxStatus } from '@yahuti/db';
import { createLogger } from '../utils/logger';
import { RiskMonitor } from '../services/risk-monitor';

const logger = createLogger('Governor');

export interface GovernorJobData {
  checkType?: 'risk' | 'performance' | 'compliance' | 'all';
  enforceThrottling?: boolean;
  generateReports?: boolean;
  emergencyMode?: boolean;
  dryRun?: boolean;
}

export interface RiskThreshold {
  name: string;
  metric: string;
  threshold: number;
  severity: AlertSeverity;
  action: 'throttle' | 'pause' | 'alert' | 'shutdown';
  description: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'degrading';
  lastUpdated: Date;
}

export interface ThrottleRule {
  component: string;
  currentLimit: number;
  newLimit: number;
  reason: string;
  duration: number; // minutes
  priority: number;
}

export interface ComplianceCheck {
  rule: string;
  status: 'compliant' | 'warning' | 'violation';
  description: string;
  lastCheck: Date;
  remediation?: string;
}

export interface GovernanceAction {
  type: 'throttle' | 'pause' | 'alert' | 'report';
  component: string;
  reason: string;
  severity: AlertSeverity;
  implemented: boolean;
  timestamp: Date;
}

// Risk thresholds that trigger governance actions
const RISK_THRESHOLDS: RiskThreshold[] = [
  {
    name: 'High Dispute Rate',
    metric: 'dispute_rate_7d',
    threshold: 0.05, // 5%
    severity: 'CRITICAL',
    action: 'pause',
    description: 'Pause all purchasing if 7-day dispute rate exceeds 5%',
  },
  {
    name: 'Chargeback Rate',
    metric: 'chargeback_rate_30d',
    threshold: 0.01, // 1%
    severity: 'CRITICAL',
    action: 'shutdown',
    description: 'Emergency shutdown if chargeback rate exceeds 1%',
  },
  {
    name: 'Cash Flow Negative',
    metric: 'cash_flow_ratio',
    threshold: -0.1, // -10%
    severity: 'CRITICAL',
    action: 'throttle',
    description: 'Throttle spending if cash flow becomes negative',
  },
  {
    name: 'Inventory Turnover',
    metric: 'inventory_turnover',
    threshold: 0.5, // 0.5x per month
    severity: 'WARN',
    action: 'throttle',
    description: 'Reduce acquisition if inventory not turning over',
  },
  {
    name: 'Customer Satisfaction',
    metric: 'customer_satisfaction',
    threshold: 3.5, // 3.5/5
    severity: 'WARN',
    action: 'alert',
    description: 'Alert if customer satisfaction drops below 3.5/5',
  },
  {
    name: 'API Error Rate',
    metric: 'api_error_rate',
    threshold: 0.1, // 10%
    severity: 'WARN',
    action: 'throttle',
    description: 'Throttle API calls if error rate exceeds 10%',
  },
];

// Performance metrics to monitor
const PERFORMANCE_METRICS = [
  'active_listings_count',
  'daily_transaction_volume',
  'average_profit_margin',
  'inventory_value',
  'cash_available',
  'system_response_time',
  'job_queue_depth',
  'memory_usage',
  'disk_usage',
];

export async function governorJob(job: Job<GovernorJobData>) {
  const {
    checkType = 'all',
    enforceThrottling = true,
    generateReports = true,
    emergencyMode = false,
    dryRun = false
  } = job.data;

  logger.info('Starting governance and risk management job', {
    checkType,
    enforceThrottling,
    generateReports,
    emergencyMode,
    dryRun,
  });

  try {
    const governanceActions: GovernanceAction[] = [];
    const performanceMetrics: PerformanceMetric[] = [];
    const complianceChecks: ComplianceCheck[] = [];

    // Update job progress
    await job.updateProgress(10);

    // Risk Assessment
    if (checkType === 'risk' || checkType === 'all') {
      logger.info('Conducting risk assessment');
      const riskActions = await conductRiskAssessment(emergencyMode, dryRun);
      governanceActions.push(...riskActions);
    }

    // Update job progress
    await job.updateProgress(30);

    // Performance Monitoring
    if (checkType === 'performance' || checkType === 'all') {
      logger.info('Monitoring system performance');
      const performanceData = await monitorSystemPerformance();
      performanceMetrics.push(...performanceData.metrics);
      governanceActions.push(...performanceData.actions);
    }

    // Update job progress
    await job.updateProgress(50);

    // Compliance Checks
    if (checkType === 'compliance' || checkType === 'all') {
      logger.info('Running compliance checks');
      complianceChecks.push(...await runComplianceChecks());
    }

    // Update job progress
    await job.updateProgress(70);

    // Implement throttling if enabled
    if (enforceThrottling && !dryRun) {
      await implementGovernanceActions(governanceActions);
    }

    // Update job progress
    await job.updateProgress(85);

    // Generate reports if requested
    let reportGenerated = false;
    if (generateReports) {
      reportGenerated = await generateGovernanceReport(
        governanceActions,
        performanceMetrics,
        complianceChecks,
        dryRun
      );
    }

    // Log governance activity
    await prisma.ledger.create({
      data: {
        event: 'governor.assessment_completed',
        payloadJson: {
          checkType,
          totalActions: governanceActions.length,
          criticalActions: governanceActions.filter(a => a.severity === 'CRITICAL').length,
          performanceMetrics: performanceMetrics.length,
          complianceIssues: complianceChecks.filter(c => c.status === 'violation').length,
          reportGenerated,
          emergencyMode,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'governor',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      checkType,
      governanceActions,
      performanceMetrics,
      complianceChecks,
      criticalActionsCount: governanceActions.filter(a => a.severity === 'CRITICAL').length,
      reportGenerated,
      dryRun,
    };

    logger.info('Governor job completed', {
      totalActions: result.governanceActions.length,
      criticalActions: result.criticalActionsCount,
      performanceMetrics: result.performanceMetrics.length,
    });

    return result;

  } catch (error) {
    logger.error('Governor job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'governor.job_failed',
        payloadJson: {
          checkType,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'governor',
      },
    });

    throw error;
  }
}

async function conductRiskAssessment(emergencyMode: boolean, dryRun: boolean): Promise<GovernanceAction[]> {
  logger.info('Starting risk assessment');
  
  const riskMonitor = RiskMonitor.getInstance();
  const actions: GovernanceAction[] = [];

  try {
    // Get overall risk evaluation
    const riskEvaluation = await riskMonitor.evaluateOverallRisk();
    
    logger.info('Risk evaluation completed', {
      overallRiskScore: riskEvaluation.overallRiskScore,
      status: riskEvaluation.status,
      criticalAlerts: riskEvaluation.criticalAlerts.length,
    });

    // Check each risk threshold
    for (const threshold of RISK_THRESHOLDS) {
      const metricValue = await getMetricValue(threshold.metric);
      
      if (shouldTriggerThreshold(metricValue, threshold)) {
        const action: GovernanceAction = {
          type: threshold.action === 'shutdown' ? 'pause' : threshold.action,
          component: getComponentForMetric(threshold.metric),
          reason: `${threshold.name}: ${threshold.metric} (${metricValue}) exceeded threshold (${threshold.threshold})`,
          severity: threshold.severity,
          implemented: false,
          timestamp: new Date(),
        };

        actions.push(action);

        // Create alert
        if (!dryRun) {
          await prisma.alert.create({
            data: {
              severity: threshold.severity,
              message: action.reason,
              module: 'governor',
            },
          });
        }

        logger.warn('Risk threshold exceeded', {
          metric: threshold.metric,
          value: metricValue,
          threshold: threshold.threshold,
          action: threshold.action,
        });
      }
    }

    // Emergency actions based on critical alerts
    if (riskEvaluation.criticalAlerts.length > 0) {
      for (const alert of riskEvaluation.criticalAlerts) {
        if (alert.severity === 'CRITICAL') {
          actions.push({
            type: 'pause',
            component: alert.marketplace || 'all_marketplaces',
            reason: alert.message,
            severity: 'CRITICAL',
            implemented: false,
            timestamp: new Date(),
          });
        }
      }
    }

    // Emergency mode specific checks
    if (emergencyMode) {
      logger.warn('Emergency mode activated - implementing strict controls');
      
      actions.push({
        type: 'throttle',
        component: 'all_operations',
        reason: 'Emergency mode activated - reducing all operations to 10% capacity',
        severity: 'CRITICAL',
        implemented: false,
        timestamp: new Date(),
      });
    }

  } catch (error) {
    logger.error('Risk assessment failed:', error);
    
    actions.push({
      type: 'alert',
      component: 'risk_monitor',
      reason: `Risk assessment system failure: ${error.message}`,
      severity: 'CRITICAL',
      implemented: false,
      timestamp: new Date(),
    });
  }

  return actions;
}

async function monitorSystemPerformance(): Promise<{
  metrics: PerformanceMetric[];
  actions: GovernanceAction[];
}> {
  logger.info('Monitoring system performance');
  
  const metrics: PerformanceMetric[] = [];
  const actions: GovernanceAction[] = [];

  for (const metricName of PERFORMANCE_METRICS) {
    try {
      const value = await calculatePerformanceMetric(metricName);
      const threshold = getPerformanceThreshold(metricName);
      const status = determineMetricStatus(value, threshold);
      const trend = await calculateMetricTrend(metricName, value);

      const metric: PerformanceMetric = {
        name: metricName,
        value,
        threshold,
        status,
        trend,
        lastUpdated: new Date(),
      };

      metrics.push(metric);

      // Generate actions for critical metrics
      if (status === 'critical') {
        actions.push({
          type: 'throttle',
          component: getComponentForMetric(metricName),
          reason: `Performance metric ${metricName} is critical (${value} vs threshold ${threshold})`,
          severity: 'CRITICAL',
          implemented: false,
          timestamp: new Date(),
        });
      } else if (status === 'warning') {
        actions.push({
          type: 'alert',
          component: getComponentForMetric(metricName),
          reason: `Performance metric ${metricName} is degraded (${value} vs threshold ${threshold})`,
          severity: 'WARN',
          implemented: false,
          timestamp: new Date(),
        });
      }

    } catch (error) {
      logger.error(`Failed to calculate metric ${metricName}:`, error);
      
      metrics.push({
        name: metricName,
        value: -1,
        threshold: -1,
        status: 'critical',
        trend: 'stable',
        lastUpdated: new Date(),
      });
    }
  }

  return { metrics, actions };
}

async function runComplianceChecks(): Promise<ComplianceCheck[]> {
  logger.info('Running compliance checks');
  
  const checks: ComplianceCheck[] = [];

  // Data retention compliance
  const oldLedgerEntries = await prisma.ledger.count({
    where: {
      ts: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }, // 1 year old
    },
  });

  checks.push({
    rule: 'Data Retention Policy',
    status: oldLedgerEntries > 10000 ? 'warning' : 'compliant',
    description: `${oldLedgerEntries} ledger entries older than 1 year`,
    lastCheck: new Date(),
    remediation: oldLedgerEntries > 10000 ? 'Archive old ledger entries' : undefined,
  });

  // Transaction monitoring compliance
  const disputedTransactions = await prisma.transaction.count({
    where: {
      status: 'DISPUTED',
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const totalTransactions = await prisma.transaction.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });

  const disputeRate = totalTransactions > 0 ? disputedTransactions / totalTransactions : 0;
  
  checks.push({
    rule: 'Transaction Dispute Monitoring',
    status: disputeRate > 0.05 ? 'violation' : disputeRate > 0.02 ? 'warning' : 'compliant',
    description: `30-day dispute rate: ${(disputeRate * 100).toFixed(2)}%`,
    lastCheck: new Date(),
    remediation: disputeRate > 0.05 ? 'Implement additional transaction monitoring' : undefined,
  });

  // Inventory compliance
  const expiredInventory = await prisma.inventory.count({
    where: {
      expiry: { lt: new Date() },
      status: 'AVAILABLE',
    },
  });

  checks.push({
    rule: 'Inventory Freshness',
    status: expiredInventory > 0 ? 'violation' : 'compliant',
    description: `${expiredInventory} expired items still marked as available`,
    lastCheck: new Date(),
    remediation: expiredInventory > 0 ? 'Remove expired inventory from listings' : undefined,
  });

  // Supplier compliance
  const blacklistedSuppliers = await prisma.supplier.count({
    where: { blacklisted: true },
  });

  const recentInventoryFromBlacklisted = await prisma.inventory.count({
    where: {
      supplier: { blacklisted: true },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  checks.push({
    rule: 'Supplier Blacklist Compliance',
    status: recentInventoryFromBlacklisted > 0 ? 'violation' : 'compliant',
    description: `${recentInventoryFromBlacklisted} recent purchases from ${blacklistedSuppliers} blacklisted suppliers`,
    lastCheck: new Date(),
    remediation: recentInventoryFromBlacklisted > 0 ? 'Review supplier screening process' : undefined,
  });

  return checks;
}

async function implementGovernanceActions(actions: GovernanceAction[]): Promise<void> {
  logger.info(`Implementing ${actions.length} governance actions`);

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'throttle':
          await implementThrottling(action);
          break;
        case 'pause':
          await implementPause(action);
          break;
        case 'alert':
          // Alerts are already created during assessment
          action.implemented = true;
          break;
        case 'report':
          // Reports are handled separately
          action.implemented = true;
          break;
      }

      logger.info('Governance action implemented', {
        type: action.type,
        component: action.component,
        reason: action.reason,
      });

    } catch (error) {
      logger.error(`Failed to implement governance action:`, error, {
        action: action.type,
        component: action.component,
      });
    }
  }
}

async function implementThrottling(action: GovernanceAction): Promise<void> {
  // In a real implementation, this would:
  // 1. Update rate limits in Redis
  // 2. Modify job queue priorities
  // 3. Adjust API rate limits
  // 4. Update system configuration
  
  logger.info('Implementing throttling', {
    component: action.component,
    reason: action.reason,
  });

  // Mock implementation - would integrate with actual system controls
  const throttleAmount = action.severity === 'CRITICAL' ? 0.1 : 0.5; // 10% or 50% capacity
  
  await prisma.ledger.create({
    data: {
      event: 'governor.throttle_implemented',
      payloadJson: {
        component: action.component,
        throttleAmount,
        reason: action.reason,
        severity: action.severity,
        timestamp: new Date().toISOString(),
      },
      actor: 'governor',
    },
  });

  action.implemented = true;
}

async function implementPause(action: GovernanceAction): Promise<void> {
  logger.warn('Implementing system pause', {
    component: action.component,
    reason: action.reason,
  });

  // Mock implementation - would pause actual operations
  await prisma.ledger.create({
    data: {
      event: 'governor.pause_implemented',
      payloadJson: {
        component: action.component,
        reason: action.reason,
        severity: action.severity,
        timestamp: new Date().toISOString(),
      },
      actor: 'governor',
    },
  });

  // Create critical alert
  await prisma.alert.create({
    data: {
      severity: 'CRITICAL',
      message: `SYSTEM PAUSED: ${action.component} - ${action.reason}`,
      module: 'governor',
    },
  });

  action.implemented = true;
}

async function generateGovernanceReport(
  actions: GovernanceAction[],
  metrics: PerformanceMetric[],
  complianceChecks: ComplianceCheck[],
  dryRun: boolean
): Promise<boolean> {
  try {
    logger.info('Generating governance report');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalActions: actions.length,
        criticalActions: actions.filter(a => a.severity === 'CRITICAL').length,
        healthyMetrics: metrics.filter(m => m.status === 'healthy').length,
        criticalMetrics: metrics.filter(m => m.status === 'critical').length,
        complianceViolations: complianceChecks.filter(c => c.status === 'violation').length,
      },
      actions,
      metrics,
      complianceChecks,
      recommendations: generateRecommendations(actions, metrics, complianceChecks),
    };

    if (!dryRun) {
      // In reality, this would save to a file system or send to monitoring dashboard
      await prisma.ledger.create({
        data: {
          event: 'governor.report_generated',
          payloadJson: report,
          actor: 'governor',
        },
      });
    }

    logger.info('Governance report generated', {
      totalActions: report.summary.totalActions,
      criticalActions: report.summary.criticalActions,
      criticalMetrics: report.summary.criticalMetrics,
    });

    return true;

  } catch (error) {
    logger.error('Failed to generate governance report:', error);
    return false;
  }
}

function generateRecommendations(
  actions: GovernanceAction[],
  metrics: PerformanceMetric[],
  complianceChecks: ComplianceCheck[]
): string[] {
  const recommendations: string[] = [];

  // Actions-based recommendations
  if (actions.filter(a => a.severity === 'CRITICAL').length > 0) {
    recommendations.push('Immediate attention required - critical governance actions triggered');
    recommendations.push('Review system health dashboard and address root causes');
  }

  // Metrics-based recommendations
  const degradingMetrics = metrics.filter(m => m.trend === 'degrading');
  if (degradingMetrics.length > 0) {
    recommendations.push(`${degradingMetrics.length} metrics showing degrading trends - investigate performance issues`);
  }

  // Compliance-based recommendations
  const violations = complianceChecks.filter(c => c.status === 'violation');
  if (violations.length > 0) {
    recommendations.push(`${violations.length} compliance violations detected - implement remediation plans`);
    violations.forEach(v => {
      if (v.remediation) {
        recommendations.push(`${v.rule}: ${v.remediation}`);
      }
    });
  }

  // General recommendations
  if (actions.length === 0 && violations.length === 0) {
    recommendations.push('System operating within normal parameters');
    recommendations.push('Continue monitoring key metrics and thresholds');
  }

  return recommendations;
}

// Helper functions for metrics calculation
async function getMetricValue(metricName: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  switch (metricName) {
    case 'dispute_rate_7d':
      const disputes7d = await prisma.transaction.count({
        where: {
          status: 'DISPUTED',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      const total7d = await prisma.transaction.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });
      return total7d > 0 ? disputes7d / total7d : 0;

    case 'chargeback_rate_30d':
      const chargebacks = await prisma.transaction.count({
        where: {
          status: 'CHARGEBACK',
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      const totalTx = await prisma.transaction.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });
      return totalTx > 0 ? chargebacks / totalTx : 0;

    case 'cash_flow_ratio':
      // Mock calculation - would integrate with actual financial data
      return 0.15 + (Math.random() - 0.5) * 0.3;

    case 'inventory_turnover':
      const soldItems = await prisma.inventory.count({
        where: {
          status: 'DELIVERED',
          updatedAt: { gte: thirtyDaysAgo },
        },
      });
      const totalInventory = await prisma.inventory.count({
        where: { status: { in: ['AVAILABLE', 'DELIVERED'] } },
      });
      return totalInventory > 0 ? soldItems / totalInventory : 0;

    case 'customer_satisfaction':
      // Mock - would calculate from actual customer feedback
      return 4.0 + Math.random() * 1.0;

    case 'api_error_rate':
      // Mock - would get from actual API monitoring
      return Math.random() * 0.15;

    default:
      return 0;
  }
}

async function calculatePerformanceMetric(metricName: string): Promise<number> {
  switch (metricName) {
    case 'active_listings_count':
      return await prisma.listing.count({
        where: { status: 'ACTIVE' },
      });

    case 'daily_transaction_volume':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return await prisma.transaction.count({
        where: { createdAt: { gte: today } },
      });

    case 'average_profit_margin':
      // Mock calculation
      return 25 + Math.random() * 10;

    case 'inventory_value':
      const inventorySum = await prisma.inventory.aggregate({
        where: { status: 'AVAILABLE' },
        _sum: { cost: true },
      });
      return Number(inventorySum._sum.cost) || 0;

    case 'system_response_time':
      // Mock - would come from actual monitoring
      return 150 + Math.random() * 100;

    case 'job_queue_depth':
      // Mock - would come from BullMQ metrics
      return Math.floor(Math.random() * 100);

    default:
      return Math.random() * 100;
  }
}

function shouldTriggerThreshold(value: number, threshold: RiskThreshold): boolean {
  if (threshold.metric.includes('rate') || threshold.metric.includes('ratio')) {
    return value > threshold.threshold;
  } else if (threshold.metric.includes('satisfaction')) {
    return value < threshold.threshold;
  }
  return value > threshold.threshold;
}

function getComponentForMetric(metricName: string): string {
  const componentMap: Record<string, string> = {
    'dispute_rate_7d': 'fulfillment',
    'chargeback_rate_30d': 'payment_processing',
    'cash_flow_ratio': 'financial_management',
    'inventory_turnover': 'inventory_management',
    'customer_satisfaction': 'customer_service',
    'api_error_rate': 'api_gateway',
    'active_listings_count': 'merchant',
    'daily_transaction_volume': 'transaction_processor',
    'system_response_time': 'infrastructure',
    'job_queue_depth': 'job_processor',
  };

  return componentMap[metricName] || 'system';
}

function getPerformanceThreshold(metricName: string): number {
  const thresholds: Record<string, number> = {
    'active_listings_count': 1000,
    'daily_transaction_volume': 100,
    'average_profit_margin': 20,
    'inventory_value': 10000,
    'system_response_time': 500,
    'job_queue_depth': 50,
  };

  return thresholds[metricName] || 100;
}

function determineMetricStatus(value: number, threshold: number): 'healthy' | 'warning' | 'critical' {
  if (value < threshold * 0.5) {
    return 'critical';
  } else if (value < threshold * 0.8) {
    return 'warning';
  } else {
    return 'healthy';
  }
}

async function calculateMetricTrend(metricName: string, currentValue: number): Promise<'improving' | 'stable' | 'degrading'> {
  // Mock trend calculation - would compare with historical data
  const randomTrend = Math.random();
  if (randomTrend < 0.3) return 'degrading';
  if (randomTrend > 0.7) return 'improving';
  return 'stable';
}

// Export functions for external monitoring
export async function getSystemHealth(): Promise<{
  overallStatus: 'healthy' | 'warning' | 'critical';
  riskScore: number;
  activeAlerts: number;
  lastGovernanceCheck: Date | null;
}> {
  const [activeAlerts, lastGovernance] = await Promise.all([
    prisma.alert.count({
      where: { resolvedTs: null },
    }),
    prisma.ledger.findFirst({
      where: { event: 'governor.assessment_completed' },
      orderBy: { ts: 'desc' },
    }),
  ]);

  const criticalAlerts = await prisma.alert.count({
    where: {
      severity: 'CRITICAL',
      resolvedTs: null,
    },
  });

  let overallStatus: 'healthy' | 'warning' | 'critical';
  if (criticalAlerts > 0) {
    overallStatus = 'critical';
  } else if (activeAlerts > 5) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'healthy';
  }

  return {
    overallStatus,
    riskScore: Math.min(100, activeAlerts * 10 + criticalAlerts * 30),
    activeAlerts,
    lastGovernanceCheck: lastGovernance?.ts || null,
  };
}

export async function getTrendingIssues(): Promise<Array<{
  issue: string;
  frequency: number;
  severity: AlertSeverity;
  trend: 'increasing' | 'stable' | 'decreasing';
}>> {
  // Mock implementation - would analyze alert patterns
  return [
    {
      issue: 'High dispute rate',
      frequency: 12,
      severity: 'WARN',
      trend: 'increasing',
    },
    {
      issue: 'Slow API responses',
      frequency: 8,
      severity: 'INFO',
      trend: 'stable',
    },
  ];
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}