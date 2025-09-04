import { Job } from 'bullmq';
import { prisma, ExperimentType, ExperimentStatus, ExperimentWinner, InventoryKind, Marketplace } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('Brains');

export interface BrainsJobData {
  experimentId?: string;
  experimentType?: ExperimentType;
  runAnalysis?: boolean;
  createNewExperiments?: boolean;
  maxConcurrentExperiments?: number;
  dryRun?: boolean;
}

export interface ExperimentConfig {
  name: string;
  type: ExperimentType;
  description: string;
  variantA: any;
  variantB: any;
  targetMetric: string;
  minimumSampleSize: number;
  maxDurationDays: number;
  significanceLevel: number;
}

export interface ExperimentResult {
  experimentId: string;
  type: ExperimentType;
  winner: ExperimentWinner;
  confidence: number;
  lift: number;
  pValue: number;
  sampleSizeA: number;
  sampleSizeB: number;
  metricA: number;
  metricB: number;
  recommendations: string[];
}

export interface LearningInsight {
  category: string;
  insight: string;
  confidence: number;
  applicability: string[];
  potentialImpact: number;
  implementation: string;
}

const EXPERIMENT_TEMPLATES: Record<ExperimentType, ExperimentConfig[]> = {
  PRICE: [
    {
      name: 'Price Point Optimization',
      type: 'PRICE',
      description: 'Test different pricing strategies for better conversion',
      variantA: { strategy: 'competitive', markup: 1.4 },
      variantB: { strategy: 'premium', markup: 1.8 },
      targetMetric: 'conversion_rate',
      minimumSampleSize: 100,
      maxDurationDays: 14,
      significanceLevel: 0.05,
    },
    {
      name: 'Dynamic Pricing Test',
      type: 'PRICE',
      description: 'Compare fixed vs dynamic pricing models',
      variantA: { type: 'fixed', adjustmentFrequency: 'never' },
      variantB: { type: 'dynamic', adjustmentFrequency: 'daily' },
      targetMetric: 'profit_per_item',
      minimumSampleSize: 200,
      maxDurationDays: 21,
      significanceLevel: 0.05,
    },
  ],
  TITLE: [
    {
      name: 'Title Format Optimization',
      type: 'TITLE',
      description: 'Test different title formats for better visibility',
      variantA: { format: 'standard', includeEmojis: false },
      variantB: { format: 'enhanced', includeEmojis: true },
      targetMetric: 'click_through_rate',
      minimumSampleSize: 150,
      maxDurationDays: 10,
      significanceLevel: 0.05,
    },
  ],
  THUMBNAIL: [
    {
      name: 'Thumbnail Style Test',
      type: 'THUMBNAIL',
      description: 'Compare different thumbnail styles',
      variantA: { style: 'clean', overlay: false },
      variantB: { style: 'promotional', overlay: true },
      targetMetric: 'view_rate',
      minimumSampleSize: 300,
      maxDurationDays: 7,
      significanceLevel: 0.05,
    },
  ],
  COPY: [
    {
      name: 'Description Length Test',
      type: 'COPY',
      description: 'Test short vs detailed product descriptions',
      variantA: { length: 'short', wordCount: 50 },
      variantB: { length: 'detailed', wordCount: 200 },
      targetMetric: 'conversion_rate',
      minimumSampleSize: 120,
      maxDurationDays: 12,
      significanceLevel: 0.05,
    },
  ],
  SOURCING: [
    {
      name: 'Supplier Reliability Test',
      type: 'SOURCING',
      description: 'Compare different supplier tiers',
      variantA: { tier: 'budget', avgRating: 3.8 },
      variantB: { tier: 'premium', avgRating: 4.5 },
      targetMetric: 'customer_satisfaction',
      minimumSampleSize: 80,
      maxDurationDays: 30,
      significanceLevel: 0.05,
    },
  ],
  DELIVERY: [
    {
      name: 'Delivery Speed vs Cost',
      type: 'DELIVERY',
      description: 'Test delivery speed impact on satisfaction',
      variantA: { method: 'standard', avgHours: 24 },
      variantB: { method: 'express', avgHours: 4 },
      targetMetric: 'customer_rating',
      minimumSampleSize: 100,
      maxDurationDays: 14,
      significanceLevel: 0.05,
    },
  ],
};

export async function brainsJob(job: Job<BrainsJobData>) {
  const {
    experimentId,
    experimentType,
    runAnalysis = true,
    createNewExperiments = true,
    maxConcurrentExperiments = 5,
    dryRun = false
  } = job.data;

  logger.info('Starting AI learning and experimentation job', {
    experimentId,
    experimentType,
    runAnalysis,
    createNewExperiments,
    maxConcurrentExperiments,
    dryRun,
  });

  try {
    let experimentResults: ExperimentResult[] = [];
    let newExperiments = 0;
    let learningInsights: LearningInsight[] = [];

    // Update job progress
    await job.updateProgress(10);

    if (experimentId) {
      // Analyze specific experiment
      const result = await analyzeExperiment(experimentId, dryRun);
      if (result) {
        experimentResults.push(result);
      }
    } else if (runAnalysis) {
      // Analyze all running experiments
      const runningExperiments = await prisma.experiment.findMany({
        where: {
          status: 'RUNNING',
          ...(experimentType && { type: experimentType }),
        },
      });

      logger.info(`Found ${runningExperiments.length} running experiments to analyze`);

      for (const experiment of runningExperiments) {
        const result = await analyzeExperiment(experiment.id, dryRun);
        if (result) {
          experimentResults.push(result);
        }
      }
    }

    // Update job progress
    await job.updateProgress(40);

    if (createNewExperiments) {
      // Check if we can create new experiments
      const currentExperimentCount = await prisma.experiment.count({
        where: { status: 'RUNNING' },
      });

      const availableSlots = maxConcurrentExperiments - currentExperimentCount;
      
      if (availableSlots > 0) {
        logger.info(`Creating up to ${availableSlots} new experiments`);
        
        const suggestions = await suggestNewExperiments(availableSlots);
        
        for (const suggestion of suggestions) {
          if (!dryRun) {
            const experiment = await createExperiment(suggestion);
            newExperiments++;
            logger.info(`Created new experiment: ${suggestion.name}`, {
              experimentId: experiment.id,
              type: suggestion.type,
            });
          } else {
            newExperiments++;
            logger.info(`[DRY RUN] Would create experiment: ${suggestion.name}`);
          }
        }
      } else {
        logger.info('Maximum concurrent experiments reached');
      }
    }

    // Update job progress
    await job.updateProgress(70);

    // Generate learning insights
    learningInsights = await generateLearningInsights(experimentResults);

    // Update job progress
    await job.updateProgress(90);

    // Log brain activity
    await prisma.ledger.create({
      data: {
        event: 'brains.analysis_completed',
        payloadJson: {
          experimentsAnalyzed: experimentResults.length,
          newExperimentsCreated: newExperiments,
          learningInsightsGenerated: learningInsights.length,
          significantFindings: experimentResults.filter(r => r.confidence > 0.95).length,
          experimentType,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'brains',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      experimentsAnalyzed: experimentResults.length,
      experimentResults,
      newExperimentsCreated: newExperiments,
      learningInsights,
      significantFindings: experimentResults.filter(r => r.confidence > 0.95).length,
      dryRun,
    };

    logger.info('Brains job completed', {
      experimentsAnalyzed: result.experimentsAnalyzed,
      newExperimentsCreated: result.newExperimentsCreated,
      significantFindings: result.significantFindings,
    });

    return result;

  } catch (error) {
    logger.error('Brains job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'brains.job_failed',
        payloadJson: {
          experimentId,
          experimentType,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'brains',
      },
    });

    throw error;
  }
}

async function analyzeExperiment(experimentId: string, dryRun: boolean): Promise<ExperimentResult | null> {
  logger.debug(`Analyzing experiment ${experimentId}`);

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
  });

  if (!experiment || experiment.status !== 'RUNNING') {
    logger.warn(`Experiment ${experimentId} not found or not running`);
    return null;
  }

  // Check if experiment has run long enough
  const runningDays = (Date.now() - experiment.startedAt.getTime()) / (24 * 60 * 60 * 1000);
  const minRunDays = 3; // Minimum 3 days
  
  if (runningDays < minRunDays) {
    logger.debug(`Experiment ${experimentId} needs more time (${runningDays.toFixed(1)} days)`);
    return null;
  }

  // Collect experiment data (mock implementation)
  const sampleData = await collectExperimentData(experiment);
  
  if (sampleData.sampleSizeA < 30 || sampleData.sampleSizeB < 30) {
    logger.debug(`Experiment ${experimentId} needs larger sample size`);
    return null;
  }

  // Perform statistical analysis
  const analysisResult = performStatisticalAnalysis(sampleData);
  
  // Determine if we have a significant result
  const isSignificant = analysisResult.pValue < 0.05;
  const hasMinimumEffect = Math.abs(analysisResult.lift) > 5; // 5% minimum effect size
  
  if (!isSignificant || !hasMinimumEffect) {
    logger.debug(`Experiment ${experimentId} not yet significant`, {
      pValue: analysisResult.pValue,
      lift: analysisResult.lift,
    });
    return null;
  }

  // Determine winner
  let winner: ExperimentWinner;
  if (analysisResult.lift > 0) {
    winner = 'B';
  } else if (analysisResult.lift < 0) {
    winner = 'A';
  } else {
    winner = 'TIE';
  }

  // Generate recommendations
  const recommendations = generateExperimentRecommendations(experiment, analysisResult, winner);

  const result: ExperimentResult = {
    experimentId: experiment.id,
    type: experiment.type,
    winner,
    confidence: 1 - analysisResult.pValue,
    lift: analysisResult.lift,
    pValue: analysisResult.pValue,
    sampleSizeA: sampleData.sampleSizeA,
    sampleSizeB: sampleData.sampleSizeB,
    metricA: sampleData.metricA,
    metricB: sampleData.metricB,
    recommendations,
  };

  // Update experiment in database if not dry run
  if (!dryRun) {
    await prisma.experiment.update({
      where: { id: experiment.id },
      data: {
        status: 'COMPLETE',
        winner,
        lift: analysisResult.lift,
        completedAt: new Date(),
      },
    });

    logger.info(`Experiment ${experimentId} completed`, {
      winner,
      lift: analysisResult.lift,
      confidence: result.confidence,
    });
  }

  return result;
}

async function collectExperimentData(experiment: any): Promise<{
  sampleSizeA: number;
  sampleSizeB: number;
  metricA: number;
  metricB: number;
}> {
  // Mock data collection - in reality this would query actual performance data
  const baseMetric = getBaselineMetric(experiment.type);
  const sampleSizeA = 50 + Math.floor(Math.random() * 200);
  const sampleSizeB = 50 + Math.floor(Math.random() * 200);
  
  // Simulate some difference between variants
  const effectSize = -0.1 + Math.random() * 0.2; // -10% to +10% effect
  const metricA = baseMetric * (1 + Math.random() * 0.1 - 0.05); // Some noise
  const metricB = baseMetric * (1 + effectSize + Math.random() * 0.1 - 0.05);

  return {
    sampleSizeA,
    sampleSizeB,
    metricA,
    metricB,
  };
}

function performStatisticalAnalysis(data: {
  sampleSizeA: number;
  sampleSizeB: number;
  metricA: number;
  metricB: number;
}): {
  lift: number;
  pValue: number;
} {
  const { metricA, metricB, sampleSizeA, sampleSizeB } = data;
  
  // Calculate lift (percentage change from A to B)
  const lift = ((metricB - metricA) / metricA) * 100;
  
  // Simplified t-test calculation (mock implementation)
  const pooledStd = Math.sqrt(
    ((sampleSizeA - 1) * Math.pow(metricA * 0.1, 2) + 
     (sampleSizeB - 1) * Math.pow(metricB * 0.1, 2)) /
    (sampleSizeA + sampleSizeB - 2)
  );
  
  const standardError = pooledStd * Math.sqrt(1/sampleSizeA + 1/sampleSizeB);
  const tStat = Math.abs(metricB - metricA) / standardError;
  
  // Simplified p-value calculation (this is a rough approximation)
  let pValue: number;
  if (tStat > 2.6) pValue = 0.01;
  else if (tStat > 2.0) pValue = 0.05;
  else if (tStat > 1.7) pValue = 0.10;
  else pValue = 0.20;
  
  return { lift, pValue };
}

function generateExperimentRecommendations(
  experiment: any,
  analysis: { lift: number; pValue: number },
  winner: ExperimentWinner
): string[] {
  const recommendations: string[] = [];
  
  if (winner === 'B') {
    recommendations.push(`Implement Variant B - shows ${analysis.lift.toFixed(1)}% improvement`);
  } else if (winner === 'A') {
    recommendations.push('Continue with Variant A - performs better than alternative');
  } else {
    recommendations.push('No significant difference - choose based on implementation cost');
  }
  
  // Type-specific recommendations
  switch (experiment.type) {
    case 'PRICE':
      if (Math.abs(analysis.lift) > 10) {
        recommendations.push('Consider gradual rollout due to significant price impact');
      }
      recommendations.push('Monitor competitor pricing after implementation');
      break;
      
    case 'TITLE':
      recommendations.push('Apply winning title format to similar products');
      if (winner === 'B') {
        recommendations.push('Consider A/B testing other title elements');
      }
      break;
      
    case 'DELIVERY':
      if (winner === 'B' && experiment.variantB.method === 'express') {
        recommendations.push('Evaluate cost vs customer satisfaction trade-off');
      }
      break;
  }
  
  recommendations.push(`Confidence level: ${((1 - analysis.pValue) * 100).toFixed(1)}%`);
  
  return recommendations;
}

async function suggestNewExperiments(maxExperiments: number): Promise<ExperimentConfig[]> {
  const suggestions: ExperimentConfig[] = [];
  
  // Get recent performance data to identify opportunities
  const recentListings = await prisma.listing.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      status: 'ACTIVE',
    },
    take: 100,
  });

  // Identify low-performing areas that need experimentation
  const lowCtrListings = recentListings.filter(l => l.ctr < 0.02);
  const oldListings = recentListings.filter(l => {
    const age = (Date.now() - l.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    return age > 7 && l.views < 10;
  });

  // Suggest experiments based on performance issues
  if (lowCtrListings.length > 20) {
    const titleExperiment = EXPERIMENT_TEMPLATES.TITLE[0];
    suggestions.push({
      ...titleExperiment,
      name: `Title Optimization for Low CTR - ${new Date().toISOString().split('T')[0]}`,
    });
  }

  if (oldListings.length > 15) {
    const priceExperiment = EXPERIMENT_TEMPLATES.PRICE[0];
    suggestions.push({
      ...priceExperiment,
      name: `Price Optimization for Stagnant Listings - ${new Date().toISOString().split('T')[0]}`,
    });
  }

  // Add systematic experiments for each type if we have capacity
  const experimentTypes = Object.keys(EXPERIMENT_TEMPLATES) as ExperimentType[];
  
  for (const type of experimentTypes) {
    if (suggestions.length >= maxExperiments) break;
    
    // Check if we haven't run this type recently
    const recentExperiment = await prisma.experiment.findFirst({
      where: {
        type,
        startedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }, // 60 days
      },
    });

    if (!recentExperiment) {
      const template = EXPERIMENT_TEMPLATES[type][0];
      suggestions.push({
        ...template,
        name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
      });
    }
  }

  return suggestions.slice(0, maxExperiments);
}

async function createExperiment(config: ExperimentConfig): Promise<any> {
  return await prisma.experiment.create({
    data: {
      type: config.type,
      variantA: config.variantA,
      variantB: config.variantB,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
}

async function generateLearningInsights(experimentResults: ExperimentResult[]): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = [];
  
  if (experimentResults.length === 0) {
    return insights;
  }

  // Analyze patterns across experiments
  const priceExperiments = experimentResults.filter(r => r.type === 'PRICE');
  const titleExperiments = experimentResults.filter(r => r.type === 'TITLE');
  
  // Price insights
  if (priceExperiments.length >= 2) {
    const avgPriceLift = priceExperiments.reduce((sum, exp) => sum + exp.lift, 0) / priceExperiments.length;
    
    if (avgPriceLift > 5) {
      insights.push({
        category: 'Pricing',
        insight: `Premium pricing strategy shows consistent positive results (avg +${avgPriceLift.toFixed(1)}%)`,
        confidence: 0.8,
        applicability: ['All categories', 'High-demand items'],
        potentialImpact: avgPriceLift,
        implementation: 'Gradually increase prices across portfolio by 10-15%',
      });
    } else if (avgPriceLift < -5) {
      insights.push({
        category: 'Pricing',
        insight: `Competitive pricing drives better performance (avg ${Math.abs(avgPriceLift).toFixed(1)}% improvement)`,
        confidence: 0.8,
        applicability: ['Price-sensitive categories', 'High-competition markets'],
        potentialImpact: Math.abs(avgPriceLift),
        implementation: 'Implement dynamic pricing to stay competitive',
      });
    }
  }
  
  // Title insights
  if (titleExperiments.length >= 1) {
    const bestTitle = titleExperiments.find(exp => exp.lift > 10);
    if (bestTitle) {
      insights.push({
        category: 'Marketing',
        insight: 'Enhanced title formats with emojis significantly improve click-through rates',
        confidence: bestTitle.confidence,
        applicability: ['Consumer categories', 'Visual marketplaces'],
        potentialImpact: bestTitle.lift,
        implementation: 'Update title templates to include relevant emojis and power words',
      });
    }
  }

  // Cross-experiment insights
  const highConfidenceResults = experimentResults.filter(r => r.confidence > 0.95);
  if (highConfidenceResults.length > 0) {
    insights.push({
      category: 'Methodology',
      insight: `${highConfidenceResults.length} experiments achieved high statistical confidence`,
      confidence: 0.9,
      applicability: ['Experimentation process'],
      potentialImpact: 15,
      implementation: 'Continue current experimental methodology and sample sizes',
    });
  }

  return insights;
}

function getBaselineMetric(experimentType: ExperimentType): number {
  const baselines = {
    'PRICE': 0.15, // 15% conversion rate
    'TITLE': 0.05, // 5% CTR
    'THUMBNAIL': 0.08, // 8% view rate
    'COPY': 0.12, // 12% conversion rate
    'SOURCING': 4.2, // 4.2/5 satisfaction score
    'DELIVERY': 4.0, // 4.0/5 rating
  };
  
  return baselines[experimentType] || 0.1;
}

// Function to get experiment statistics
export async function getExperimentStats(days: number = 30): Promise<{
  totalExperiments: number;
  runningExperiments: number;
  completedExperiments: number;
  significantResults: number;
  avgLift: number;
  topPerformingType: ExperimentType;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalExperiments, runningExperiments, completedExperiments] = await Promise.all([
    prisma.experiment.count({
      where: { startedAt: { gte: startDate } },
    }),
    prisma.experiment.count({
      where: { status: 'RUNNING' },
    }),
    prisma.experiment.count({
      where: {
        status: 'COMPLETE',
        completedAt: { gte: startDate },
      },
    }),
  ]);

  const completedWithResults = await prisma.experiment.findMany({
    where: {
      status: 'COMPLETE',
      completedAt: { gte: startDate },
      lift: { not: null },
    },
  });

  const significantResults = completedWithResults.filter(exp => Math.abs(exp.lift || 0) > 5).length;
  const avgLift = completedWithResults.length > 0 ?
    completedWithResults.reduce((sum, exp) => sum + Math.abs(exp.lift || 0), 0) / completedWithResults.length : 0;

  // Find top performing experiment type
  const typePerformance = new Map<ExperimentType, number[]>();
  completedWithResults.forEach(exp => {
    if (!typePerformance.has(exp.type)) {
      typePerformance.set(exp.type, []);
    }
    typePerformance.get(exp.type)!.push(Math.abs(exp.lift || 0));
  });

  let topPerformingType: ExperimentType = 'PRICE';
  let bestAvgLift = 0;
  
  typePerformance.forEach((lifts, type) => {
    const avgTypeLift = lifts.reduce((sum, lift) => sum + lift, 0) / lifts.length;
    if (avgTypeLift > bestAvgLift) {
      bestAvgLift = avgTypeLift;
      topPerformingType = type;
    }
  });

  return {
    totalExperiments,
    runningExperiments,
    completedExperiments,
    significantResults,
    avgLift: Math.round(avgLift * 10) / 10,
    topPerformingType,
  };
}

// Function to get learning insights summary
export async function getLearningInsightsSummary(): Promise<{
  totalInsights: number;
  highImpactInsights: number;
  implementedRecommendations: number;
  topCategories: string[];
}> {
  // This would typically query a dedicated insights table
  // For now, return mock data based on recent experiment activity
  
  const recentExperiments = await prisma.experiment.count({
    where: {
      status: 'COMPLETE',
      completedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    totalInsights: Math.floor(recentExperiments * 0.6),
    highImpactInsights: Math.floor(recentExperiments * 0.2),
    implementedRecommendations: Math.floor(recentExperiments * 0.4),
    topCategories: ['Pricing', 'Marketing', 'Operations', 'Customer Experience'],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}