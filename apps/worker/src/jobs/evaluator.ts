import { Job } from 'bullmq';
import { prisma, DealCandidateStatus, Marketplace } from '@yahuti/db';
import { createLogger } from '../utils/logger';
import { FeeCalculator } from '../services/fee-calculator';
import { RiskMonitor } from '../services/risk-monitor';

const logger = createLogger('Evaluator');

export interface EvaluatorJobData {
  candidateId?: string;
  batchSize?: number;
  minMargin?: number;
  maxRiskScore?: number;
  dryRun?: boolean;
}

export interface EvaluationCriteria {
  minNetMargin: number;
  minConfidence: number;
  maxRiskScore: number;
  minSellerScore: number;
  maxExpectedSellThroughDays: number;
  requiredMarketplaces: Marketplace[];
  blacklistedSources: string[];
}

export interface EvaluationResult {
  approved: boolean;
  netMargin: number;
  projectedProfit: number;
  bestMarketplace: Marketplace;
  estimatedFees: number;
  riskScore: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
}

const DEFAULT_EVALUATION_CRITERIA: EvaluationCriteria = {
  minNetMargin: 0.20, // 20% minimum margin
  minConfidence: 0.75, // 75% confidence threshold
  maxRiskScore: 60, // Max risk score out of 100
  minSellerScore: 0.7, // 70% seller score
  maxExpectedSellThroughDays: 14, // 2 weeks max
  requiredMarketplaces: ['EBAY', 'AMAZON', 'G2G'], // Must be listable on at least one
  blacklistedSources: ['SUSPICIOUS_SUPPLIER', 'UNRELIABLE_VENDOR'],
};

export async function evaluatorJob(job: Job<EvaluatorJobData>) {
  const { 
    candidateId,
    batchSize = 50,
    minMargin = 0.20,
    maxRiskScore = 60,
    dryRun = false 
  } = job.data;

  logger.info('Starting deal evaluation', { 
    candidateId, 
    batchSize, 
    minMargin, 
    maxRiskScore, 
    dryRun 
  });

  try {
    const feeCalculator = FeeCalculator.getInstance();
    const riskMonitor = RiskMonitor.getInstance();

    let candidates;
    let totalCandidates;

    if (candidateId) {
      // Evaluate specific candidate
      const candidate = await prisma.dealCandidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error(`Candidate ${candidateId} not found`);
      }

      candidates = [candidate];
      totalCandidates = 1;
    } else {
      // Evaluate batch of pending candidates
      candidates = await prisma.dealCandidate.findMany({
        where: {
          status: 'PENDING',
          netMargin: { gte: minMargin },
        },
        take: batchSize,
        orderBy: [
          { netMargin: 'desc' },
          { confidence: 'desc' },
        ],
      });
      totalCandidates = candidates.length;
    }

    if (candidates.length === 0) {
      logger.info('No candidates to evaluate');
      return {
        success: true,
        totalCandidates: 0,
        evaluated: 0,
        approved: 0,
        rejected: 0,
        dryRun,
      };
    }

    logger.info(`Found ${candidates.length} candidates to evaluate`);

    // Update job progress
    await job.updateProgress(10);

    const evaluationResults = [];
    let approvedCount = 0;
    let rejectedCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      
      logger.debug(`Evaluating candidate ${candidate.sku}`, {
        source: candidate.source,
        cost: candidate.cost,
        estimatedResale: candidate.estimatedResale,
        netMargin: candidate.netMargin,
      });

      try {
        // Perform comprehensive evaluation
        const evaluation = await evaluateCandidate(candidate, {
          ...DEFAULT_EVALUATION_CRITERIA,
          minNetMargin: minMargin,
          maxRiskScore,
        });

        evaluationResults.push({
          candidate,
          evaluation,
        });

        // Update candidate status unless dry run
        if (!dryRun) {
          const newStatus = evaluation.approved ? 'APPROVED' : 'REJECTED';
          
          await prisma.dealCandidate.update({
            where: { id: candidate.id },
            data: {
              status: newStatus,
              processedAt: new Date(),
              notes: `${candidate.notes || ''}\n\nEvaluation: ${evaluation.reasons.join('; ')}${
                evaluation.warnings.length > 0 ? `\nWarnings: ${evaluation.warnings.join('; ')}` : ''
              }`.trim(),
            },
          });

          if (evaluation.approved) {
            approvedCount++;
            logger.info(`Approved candidate ${candidate.sku}`, {
              netMargin: evaluation.netMargin,
              projectedProfit: evaluation.projectedProfit,
              bestMarketplace: evaluation.bestMarketplace,
            });
          } else {
            rejectedCount++;
            logger.info(`Rejected candidate ${candidate.sku}`, {
              reasons: evaluation.reasons,
            });
          }
        } else {
          // Dry run - just count
          if (evaluation.approved) {
            approvedCount++;
          } else {
            rejectedCount++;
          }
        }

        // Update progress
        const progress = 10 + ((i + 1) / candidates.length) * 85;
        await job.updateProgress(Math.round(progress));

      } catch (error) {
        logger.error(`Failed to evaluate candidate ${candidate.sku}:`, error);
        
        // Log evaluation failure
        await prisma.ledger.create({
          data: {
            event: 'evaluator.candidate_failed',
            payloadJson: {
              candidateId: candidate.id,
              sku: candidate.sku,
              error: error.message,
              timestamp: new Date().toISOString(),
            },
            actor: 'evaluator',
          },
        });
      }
    }

    // Log evaluation summary
    await prisma.ledger.create({
      data: {
        event: 'evaluator.batch_completed',
        payloadJson: {
          totalCandidates: candidates.length,
          approved: approvedCount,
          rejected: rejectedCount,
          approvalRate: candidates.length > 0 ? approvedCount / candidates.length : 0,
          criteria: {
            minMargin,
            maxRiskScore,
          },
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'evaluator',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      totalCandidates: candidates.length,
      evaluated: candidates.length,
      approved: approvedCount,
      rejected: rejectedCount,
      approvalRate: approvedCount / candidates.length,
      dryRun,
    };

    logger.info('Deal evaluation completed', result);
    return result;

  } catch (error) {
    logger.error('Evaluation job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'evaluator.job_failed',
        payloadJson: {
          candidateId,
          batchSize,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'evaluator',
      },
    });

    throw error;
  }
}

async function evaluateCandidate(
  candidate: any,
  criteria: EvaluationCriteria
): Promise<EvaluationResult> {
  const feeCalculator = FeeCalculator.getInstance();
  const riskMonitor = RiskMonitor.getInstance();
  
  const reasons: string[] = [];
  const warnings: string[] = [];
  let approved = true;

  // Check if source is blacklisted
  if (criteria.blacklistedSources.includes(candidate.source)) {
    approved = false;
    reasons.push(`Source ${candidate.source} is blacklisted`);
  }

  // Check minimum net margin
  if (candidate.netMargin < criteria.minNetMargin) {
    approved = false;
    reasons.push(`Net margin ${(candidate.netMargin * 100).toFixed(1)}% below minimum ${(criteria.minNetMargin * 100).toFixed(1)}%`);
  }

  // Check confidence threshold
  if (candidate.confidence < criteria.minConfidence) {
    approved = false;
    reasons.push(`Confidence ${(candidate.confidence * 100).toFixed(1)}% below minimum ${(criteria.minConfidence * 100).toFixed(1)}%`);
  }

  // Check seller score
  if (candidate.sellerScore < criteria.minSellerScore) {
    if (candidate.sellerScore < criteria.minSellerScore * 0.8) {
      approved = false;
      reasons.push(`Seller score ${(candidate.sellerScore * 100).toFixed(1)}% too low`);
    } else {
      warnings.push(`Seller score ${(candidate.sellerScore * 100).toFixed(1)}% below preferred threshold`);
    }
  }

  // Check expected sell-through time
  if (candidate.expectedSellThroughDays > criteria.maxExpectedSellThroughDays) {
    if (candidate.expectedSellThroughDays > criteria.maxExpectedSellThroughDays * 2) {
      approved = false;
      reasons.push(`Expected sell-through time ${candidate.expectedSellThroughDays.toFixed(1)} days too long`);
    } else {
      warnings.push(`Long expected sell-through time: ${candidate.expectedSellThroughDays.toFixed(1)} days`);
    }
  }

  // Find best marketplace and calculate accurate fees
  const bestMarketplaceResult = feeCalculator.getBestMarketplace(
    Number(candidate.cost),
    Number(candidate.estimatedResale),
    candidate.kind
  );

  if (!bestMarketplaceResult) {
    approved = false;
    reasons.push(`No suitable marketplace found for ${candidate.kind}`);
    
    return {
      approved: false,
      netMargin: candidate.netMargin,
      projectedProfit: 0,
      bestMarketplace: 'EBAY' as Marketplace, // fallback
      estimatedFees: Number(candidate.estimatedFees),
      riskScore: 100,
      confidence: candidate.confidence,
      reasons,
      warnings,
    };
  }

  // Check if best marketplace is in required list
  if (!criteria.requiredMarketplaces.includes(bestMarketplaceResult.marketplace)) {
    warnings.push(`Best marketplace ${bestMarketplaceResult.marketplace} not in preferred list`);
  }

  // Calculate risk score for the category
  const categoryRiskProfile = await riskMonitor.evaluateCategoryRisk(candidate.kind);
  const marketplaceRiskProfile = await riskMonitor.evaluateMarketplaceRisk(bestMarketplaceResult.marketplace);
  
  // Combined risk score (weighted average)
  const riskScore = Math.round((categoryRiskProfile.riskScore * 0.4) + (marketplaceRiskProfile.riskScore * 0.6));

  // Check risk score
  if (riskScore > criteria.maxRiskScore) {
    if (riskScore > criteria.maxRiskScore * 1.5) {
      approved = false;
      reasons.push(`Risk score ${riskScore} exceeds maximum ${criteria.maxRiskScore}`);
    } else {
      warnings.push(`High risk score: ${riskScore}/${criteria.maxRiskScore}`);
    }
  }

  // Calculate more accurate fees using the fee calculator
  const feeBreakdown = feeCalculator.calculateFees({
    marketplace: bestMarketplaceResult.marketplace,
    category: candidate.kind,
    salePrice: Number(candidate.estimatedResale),
  });

  const actualNetMargin = feeBreakdown.netAmount / Number(candidate.estimatedResale);
  const projectedProfit = feeBreakdown.netAmount - Number(candidate.cost);

  // Recheck net margin with accurate fees
  if (actualNetMargin < criteria.minNetMargin) {
    approved = false;
    reasons.push(`Accurate net margin ${(actualNetMargin * 100).toFixed(1)}% below minimum after fee calculation`);
  }

  // Check for negative profit
  if (projectedProfit <= 0) {
    approved = false;
    reasons.push('Negative projected profit after accurate fee calculation');
  }

  // Add positive reasons for approved deals
  if (approved) {
    reasons.push(`Strong ${(actualNetMargin * 100).toFixed(1)}% margin`);
    reasons.push(`$${projectedProfit.toFixed(2)} projected profit`);
    reasons.push(`${(candidate.confidence * 100).toFixed(1)}% confidence`);
    
    if (riskScore < criteria.maxRiskScore * 0.5) {
      reasons.push('Low risk score');
    }
    
    if (candidate.expectedSellThroughDays < criteria.maxExpectedSellThroughDays * 0.5) {
      reasons.push('Fast expected sell-through');
    }
  }

  return {
    approved,
    netMargin: actualNetMargin,
    projectedProfit,
    bestMarketplace: bestMarketplaceResult.marketplace,
    estimatedFees: feeBreakdown.totalFees,
    riskScore,
    confidence: candidate.confidence,
    reasons,
    warnings,
  };
}

// Helper function to get evaluation criteria from playbook or config
export async function getEvaluationCriteria(): Promise<EvaluationCriteria> {
  try {
    // Try to get criteria from active playbook
    const activePlaybook = await prisma.playbook.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { activatedAt: 'desc' },
    });

    if (activePlaybook) {
      // Parse YAML content to extract evaluation criteria
      // This is a simplified implementation - in reality you'd parse the YAML
      logger.debug('Using criteria from active playbook', { playbook: activePlaybook.name });
    }

    // Fallback to default criteria
    return DEFAULT_EVALUATION_CRITERIA;

  } catch (error) {
    logger.warn('Failed to load playbook criteria, using defaults:', error);
    return DEFAULT_EVALUATION_CRITERIA;
  }
}

// Function to update evaluation criteria
export async function updateEvaluationCriteria(criteria: Partial<EvaluationCriteria>): Promise<void> {
  logger.info('Updating evaluation criteria', criteria);
  
  // In a real implementation, this would update the active playbook or configuration
  Object.assign(DEFAULT_EVALUATION_CRITERIA, criteria);
  
  await prisma.ledger.create({
    data: {
      event: 'evaluator.criteria_updated',
      payloadJson: {
        oldCriteria: DEFAULT_EVALUATION_CRITERIA,
        newCriteria: { ...DEFAULT_EVALUATION_CRITERIA, ...criteria },
        timestamp: new Date().toISOString(),
      },
      actor: 'evaluator',
    },
  });
}