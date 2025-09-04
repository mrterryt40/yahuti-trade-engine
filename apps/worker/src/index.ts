#!/usr/bin/env node

import { config } from 'dotenv';
import { Worker } from 'bullmq';
import { createLogger } from './utils/logger';
import { redisConnection } from './config/redis';

// Import job processors
import { hunterJobs } from './jobs/hunter';
import { evaluatorJobs } from './jobs/evaluator';
import { buyerJobs } from './jobs/buyer';
import { merchantJobs } from './jobs/merchant';
import { fulfillmentJobs } from './jobs/fulfillment';
import { repriceJobs } from './jobs/reprice';
import { allocatorJobs } from './jobs/allocator';
import { brainsJobs } from './jobs/brains';
import { governorJobs } from './jobs/governor';
import { collectorJobs } from './jobs/collector';

// Load environment variables
config();

const logger = createLogger('WorkerMain');

// Worker configuration
const workerConfigs = [
  { name: 'q.hunter', processor: hunterJobs, concurrency: parseInt(process.env.HUNTER_CONCURRENCY || '5') },
  { name: 'q.evaluator', processor: evaluatorJobs, concurrency: parseInt(process.env.EVALUATOR_CONCURRENCY || '3') },
  { name: 'q.buyer', processor: buyerJobs, concurrency: parseInt(process.env.BUYER_CONCURRENCY || '2') },
  { name: 'q.merchant', processor: merchantJobs, concurrency: parseInt(process.env.MERCHANT_CONCURRENCY || '3') },
  { name: 'q.fulfillment', processor: fulfillmentJobs, concurrency: parseInt(process.env.FULFILLMENT_CONCURRENCY || '5') },
  { name: 'q.reprice', processor: repriceJobs, concurrency: parseInt(process.env.REPRICE_CONCURRENCY || '2') },
  { name: 'q.allocator', processor: allocatorJobs, concurrency: parseInt(process.env.ALLOCATOR_CONCURRENCY || '1') },
  { name: 'q.brains', processor: brainsJobs, concurrency: parseInt(process.env.BRAINS_CONCURRENCY || '1') },
  { name: 'q.governor', processor: governorJobs, concurrency: parseInt(process.env.GOVERNOR_CONCURRENCY || '1') },
  { name: 'q.collector', processor: collectorJobs, concurrency: parseInt(process.env.COLLECTOR_CONCURRENCY || '3') },
];

// Start all workers
async function startWorkers() {
  logger.info('🚀 Starting Yahuti Trade Engine Workers...');
  
  const workers: Worker[] = [];

  // Create and start workers
  for (const config of workerConfigs) {
    try {
      const worker = new Worker(config.name, config.processor, {
        connection: redisConnection,
        concurrency: config.concurrency,
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 100, // Keep last 100 failed jobs
        settings: {
          stalledInterval: 30 * 1000, // 30 seconds
          retryProcessDelay: 5000, // 5 seconds between retries
        }
      });

      // Worker event handlers
      worker.on('ready', () => {
        logger.info(`✅ ${config.name} worker ready (concurrency: ${config.concurrency})`);
      });

      worker.on('error', (error) => {
        logger.error(`❌ ${config.name} worker error:`, error);
      });

      worker.on('stalled', (jobId) => {
        logger.warn(`⚠️ ${config.name} job ${jobId} stalled`);
      });

      worker.on('completed', (job) => {
        logger.debug(`✅ ${config.name} job ${job.id} completed`);
      });

      worker.on('failed', (job, err) => {
        logger.error(`❌ ${config.name} job ${job?.id} failed:`, err.message);
      });

      workers.push(worker);
    } catch (error) {
      logger.error(`Failed to start ${config.name} worker:`, error);
    }
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, shutting down workers gracefully...`);
    
    await Promise.all(workers.map(worker => worker.close()));
    logger.info('✅ All workers shut down gracefully');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info(`🎯 All ${workers.length} workers started successfully`);
  logger.info('🔄 Workers are now processing jobs...');

  return workers;
}

// Health check endpoint (optional)
async function startHealthServer() {
  const express = await import('express');
  const app = express.default();
  
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      workers: workerConfigs.length,
      uptime: process.uptime()
    });
  });

  const port = process.env.WORKER_HEALTH_PORT || 3002;
  app.listen(port, () => {
    logger.info(`🏥 Worker health server running on port ${port}`);
  });
}

// Start the worker system
if (require.main === module) {
  Promise.all([
    startWorkers(),
    startHealthServer()
  ]).catch((error) => {
    logger.error('💥 Failed to start worker system:', error);
    process.exit(1);
  });
}

export { startWorkers };