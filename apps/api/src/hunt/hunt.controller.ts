import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HuntService } from './hunt.service';
import type { DealCandidate, DealCandidateFilters, ApproveRuleRequest, PaginationParams } from '@yahuti/contracts';

@ApiTags('Hunt')
@Controller('hunt')
export class HuntController {
  constructor(private readonly huntService: HuntService) {}

  @Get('candidates')
  @ApiOperation({ summary: 'Get deal candidates for Hunt Board' })
  @ApiResponse({ status: 200, description: 'Deal candidates retrieved successfully' })
  async getCandidates(
    @Query() pagination: PaginationParams,
    @Query() filters: DealCandidateFilters,
  ) {
    return this.huntService.getCandidates(pagination, filters);
  }

  @Post('approve-rule')
  @ApiOperation({ summary: 'Approve sourcing rule for automated buying' })
  @ApiResponse({ status: 200, description: 'Rule approved successfully' })
  async approveRule(@Body() request: ApproveRuleRequest) {
    return this.huntService.approveRule(request);
  }

  @Get('suppliers/heatmap')
  @ApiOperation({ summary: 'Get supplier performance heatmap' })
  @ApiResponse({ status: 200, description: 'Supplier heatmap retrieved successfully' })
  async getSupplierHeatmap() {
    return this.huntService.getSupplierHeatmap();
  }
}