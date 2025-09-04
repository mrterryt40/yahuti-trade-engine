import { Redis } from 'ioredis';
import { createLogger } from '../utils/logger';

const logger = createLogger('Redis');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis connection for BullMQ
export const redisConnection = new Redis({
  ...redisConfig,
  db: 0, // Use database 0 for queues
});

// Create Redis connection for general use
export const redisClient = new Redis({
  ...redisConfig,
  db: 1, // Use database 1 for general caching
});

// Connection event handlers
redisConnection.on('connect', () => {
  logger.info('🔗 Redis connection established (BullMQ)');
});

redisConnection.on('ready', () => {
  logger.info('✅ Redis ready (BullMQ)');
});

redisConnection.on('error', (error) => {
  logger.error('❌ Redis connection error (BullMQ):', error);
});

redisConnection.on('close', () => {
  logger.warn('🔌 Redis connection closed (BullMQ)');
});

redisClient.on('connect', () => {
  logger.info('🔗 Redis client connected (General)');
});

redisClient.on('error', (error) => {
  logger.error('❌ Redis client error (General):', error);
});

// Test connections
async function testConnections() {
  try {
    await redisConnection.ping();
    logger.info('🏓 Redis BullMQ connection test successful');
    
    await redisClient.ping();
    logger.info('🏓 Redis client connection test successful');
  } catch (error) {
    logger.error('💥 Redis connection test failed:', error);
    throw error;
  }
}

// Initialize connections
if (process.env.NODE_ENV !== 'test') {
  testConnections().catch((error) => {
    logger.error('Failed to connect to Redis:', error);
    process.exit(1);
  });
}

export { testConnections };