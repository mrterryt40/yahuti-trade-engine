import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import type { PaginationParams } from '@yahuti/contracts';

@ApiTags('Ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('entries')
  @ApiOperation({ summary: 'Get all ledger entries (audit logs)' })
  @ApiResponse({ status: 200, description: 'Ledger entries retrieved successfully' })
  async getLedgerEntries(@Query() pagination: PaginationParams, @Query('module') module?: string) {
    return this.ledgerService.getLedgerEntries(pagination, module);
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Get ledger entry by ID' })
  @ApiResponse({ status: 200, description: 'Ledger entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ledger entry not found' })
  async getLedgerEntryById(@Param('id') id: string) {
    return this.ledgerService.getLedgerEntryById(id);
  }

  @Post('entries')
  @ApiOperation({ summary: 'Create new ledger entry' })
  @ApiResponse({ status: 201, description: 'Ledger entry created successfully' })
  async createLedgerEntry(@Body() entry: any) {
    return this.ledgerService.createLedgerEntry(entry);
  }

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Update ledger entry' })
  @ApiResponse({ status: 200, description: 'Ledger entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Ledger entry not found' })
  async updateLedgerEntry(@Param('id') id: string, @Body() updates: any) {
    return this.ledgerService.updateLedgerEntry(id, updates);
  }

  @Delete('entries/:id')
  @ApiOperation({ summary: 'Delete ledger entry' })
  @ApiResponse({ status: 200, description: 'Ledger entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Ledger entry not found' })
  async deleteLedgerEntry(@Param('id') id: string) {
    return this.ledgerService.deleteLedgerEntry(id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get audit activity summary' })
  @ApiResponse({ status: 200, description: 'Audit summary retrieved successfully' })
  async getAuditSummary() {
    return this.ledgerService.getAuditSummary();
  }

  @Get('modules')
  @ApiOperation({ summary: 'Get list of modules with audit logs' })
  @ApiResponse({ status: 200, description: 'Audit modules retrieved successfully' })
  async getAuditModules() {
    return this.ledgerService.getAuditModules();
  }
}