import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExperimentsService } from './experiments.service';
import type { Experiment, PaginationParams } from '@yahuti/contracts';

@ApiTags('Experiments')
@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all experiments' })
  @ApiResponse({ status: 200, description: 'Experiments retrieved successfully' })
  async getExperiments(@Query() pagination: PaginationParams) {
    return this.experimentsService.getExperiments(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get experiment by ID' })
  @ApiResponse({ status: 200, description: 'Experiment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async getExperimentById(@Param('id') id: string): Promise<Experiment> {
    return this.experimentsService.getExperimentById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new experiment' })
  @ApiResponse({ status: 201, description: 'Experiment created successfully' })
  async createExperiment(@Body() experiment: Partial<Experiment>): Promise<Experiment> {
    return this.experimentsService.createExperiment(experiment);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update experiment' })
  @ApiResponse({ status: 200, description: 'Experiment updated successfully' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async updateExperiment(@Param('id') id: string, @Body() updates: Partial<Experiment>): Promise<Experiment> {
    return this.experimentsService.updateExperiment(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete experiment' })
  @ApiResponse({ status: 200, description: 'Experiment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Experiment not found' })
  async deleteExperiment(@Param('id') id: string) {
    return this.experimentsService.deleteExperiment(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete experiment and determine winner' })
  @ApiResponse({ status: 200, description: 'Experiment completed successfully' })
  async completeExperiment(@Param('id') id: string) {
    return this.experimentsService.completeExperiment(id);
  }

  @Get('active/summary')
  @ApiOperation({ summary: 'Get summary of active experiments' })
  @ApiResponse({ status: 200, description: 'Active experiments summary retrieved successfully' })
  async getActiveExperimentsSummary() {
    return this.experimentsService.getActiveExperimentsSummary();
  }
}