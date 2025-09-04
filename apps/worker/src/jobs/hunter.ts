import { Job } from 'bullmq';
import { prisma } from '@yahuti/db';
import { createLogger } from '../utils/logger';
import { SourceScanner } from '../services/source-scanner';

const logger = createLogger('Hunter');

export interface HunterJobData {
  source: string;
  categories?: string[];
  maxItems?: number;
  dryRun?: boolean;
}

export async function hunterJobs(job: Job<HunterJobData>) {
  const { source, categories = ['KEY', 'ACCOUNT', 'DOMAIN', 'GIFTCARD'], maxItems = 100, dryRun = false } = job.data;
  
  logger.info(`🔍 Starting hunt on ${source}...`, { source, categories, maxItems, dryRun });
  
  try {
    // Initialize source scanner
    const scanner = new SourceScanner(source);
    
    // Scan for deals
    const candidates = await scanner.scanDeals({
      categories,
      maxItems,
      minMargin: 0.25, // 25% minimum margin
      minConfidence: 0.7, // 70% confidence threshold
    });

    logger.info(`📊 Found ${candidates.length} potential deals`, { source, count: candidates.length });

    // Save candidates to database (unless dry run)
    if (!dryRun) {
      const saved = await Promise.all(
        candidates.map(candidate => 
          prisma.dealCandidate.create({
            data: {
              source: candidate.source,
              sku: candidate.sku,
              kind: candidate.kind,
              cost: candidate.cost,
              estimatedResale: candidate.estimatedResale,
              estimatedFees: candidate.estimatedFees,
              netMargin: candidate.netMargin,
              confidence: candidate.confidence,
              sellerScore: candidate.sellerScore,
              expectedSellThroughDays: candidate.expectedSellThroughDays,
              quantity: candidate.quantity,
              notes: candidate.notes,
              status: 'PENDING',
            }
          }).catch(error => {
            logger.warn(`Failed to save candidate ${candidate.sku}:`, error.message);
            return null;
          })
        )
      );

      const successCount = saved.filter(Boolean).length;
      logger.info(`💾 Saved ${successCount}/${candidates.length} candidates`, { source, saved: successCount });

      // Log hunt activity
      await prisma.ledger.create({
        data: {
          event: 'hunter.scan_completed',
          payloadJson: {
            source,
            candidatesFound: candidates.length,
            candidatesSaved: successCount,
            categories,
            timestamp: new Date().toISOString(),
          },
          actor: 'hunter',
        }
      });
    }

    // Update job progress
    await job.updateProgress(100);

    return {
      success: true,
      source,
      candidatesFound: candidates.length,
      candidatesSaved: dryRun ? 0 : candidates.length,
      dryRun,
    };

  } catch (error) {
    logger.error(`💥 Hunt failed for ${source}:`, error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'hunter.scan_failed',
        payloadJson: {
          source,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'hunter',
      }
    });

    throw error;
  }
}