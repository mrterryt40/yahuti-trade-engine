import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CashflowService } from './cashflow.service';
import type { PaginationParams } from '@yahuti/contracts';

@ApiTags('Cashflow')
@Controller('cashflow')
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get cashflow summary' })
  @ApiResponse({ status: 200, description: 'Cashflow summary retrieved successfully' })
  async getCashflowSummary() {
    return this.cashflowService.getCashflowSummary();
  }

  @Get('entries')
  @ApiOperation({ summary: 'Get all cashflow entries' })
  @ApiResponse({ status: 200, description: 'Cashflow entries retrieved successfully' })
  async getCashflowEntries(@Query() pagination: PaginationParams) {
    return this.cashflowService.getCashflowEntries(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cashflow entry by ID' })
  @ApiResponse({ status: 200, description: 'Cashflow entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cashflow entry not found' })
  async getCashflowById(@Param('id') id: string) {
    return this.cashflowService.getCashflowById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new cashflow entry' })
  @ApiResponse({ status: 201, description: 'Cashflow entry created successfully' })
  async createCashflowEntry(@Body() entry: any) {
    return this.cashflowService.createCashflowEntry(entry);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cashflow entry' })
  @ApiResponse({ status: 200, description: 'Cashflow entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Cashflow entry not found' })
  async updateCashflowEntry(@Param('id') id: string, @Body() updates: any) {
    return this.cashflowService.updateCashflowEntry(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cashflow entry' })
  @ApiResponse({ status: 200, description: 'Cashflow entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cashflow entry not found' })
  async deleteCashflowEntry(@Param('id') id: string) {
    return this.cashflowService.deleteCashflowEntry(id);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Process withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal processed successfully' })
  async processWithdrawal(@Body() request: any) {
    return this.cashflowService.processWithdrawal(request);
  }
}