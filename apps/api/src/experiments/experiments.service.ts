import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Experiment, PaginationParams } from '@yahuti/contracts';

@Injectable()
export class ExperimentsService {
  private readonly logger = new Logger(ExperimentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getExperiments(pagination: PaginationParams) {
    this.logger.log('Getting experiments with pagination', pagination);
    
    // Mock response for now
    return {
      items: [
        {
          id: '1',
          type: 'PRICE',
          variantA: { price: 29.99 },
          variantB: { price: 27.99 },
          winner: 'PENDING',
          status: 'RUNNING',
          startedAt: new Date().toISOString(),
        }
      ],
      total: 1,
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      hasNext: false,
      hasPrev: false,
    };
  }

  async getExperimentById(id: string): Promise<Experiment> {
    this.logger.log(`Getting experiment by ID: ${id}`);
    
    // Mock response for now
    return {
      id,
      type: 'PRICE',
      variantA: { price: 29.99 },
      variantB: { price: 27.99 },
      winner: 'PENDING',
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    };
  }

  async createExperiment(experiment: Partial<Experiment>): Promise<Experiment> {
    this.logger.log('Creating new experiment', experiment);
    
    // Mock response for now
    return {
      id: 'new-experiment-id',
      type: experiment.type || 'PRICE',
      variantA: experiment.variantA || { price: 29.99 },
      variantB: experiment.variantB || { price: 27.99 },
      winner: 'PENDING',
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    };
  }

  async updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment> {
    this.logger.log(`Updating experiment ${id}`, updates);
    
    // Mock response for now
    return {
      id,
      type: updates.type || 'PRICE',
      variantA: updates.variantA || { price: 29.99 },
      variantB: updates.variantB || { price: 27.99 },
      winner: updates.winner || 'PENDING',
      lift: updates.lift,
      status: updates.status || 'RUNNING',
      startedAt: new Date().toISOString(),
      completedAt: updates.completedAt,
    };
  }

  async deleteExperiment(id: string): Promise<{ success: boolean }> {
    this.logger.log(`Deleting experiment ${id}`);
    
    // Mock response for now
    return { success: true };
  }

  async completeExperiment(id: string) {
    this.logger.log(`Completing experiment ${id}`);
    
    // Mock response for now
    return {
      id,
      winner: 'A',
      lift: 0.15,
      confidence: 0.95,
      completedAt: new Date().toISOString(),
      summary: 'Variant A showed 15% improvement in conversion rate',
    };
  }

  async getActiveExperimentsSummary() {
    this.logger.log('Getting active experiments summary');
    
    // Mock response for now
    return {
      totalActive: 3,
      byType: {
        PRICE: 2,
        TITLE: 1,
        THUMBNAIL: 0,
        COPY: 0,
        SOURCING: 0,
        DELIVERY: 0,
      },
      recentCompletions: [
        {
          id: 'exp-123',
          type: 'PRICE',
          winner: 'B',
          lift: 0.12,
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ],
    };
  }
}