import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import type { Transaction, PaginationParams } from '@yahuti/contracts';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(@Query() pagination: PaginationParams) {
    return this.transactionsService.getTransactions(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionById(@Param('id') id: string) {
    return this.transactionsService.getTransactionById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async createTransaction(@Body() transaction: Partial<Transaction>) {
    return this.transactionsService.createTransaction(transaction);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async updateTransaction(@Param('id') id: string, @Body() updates: Partial<Transaction>) {
    return this.transactionsService.updateTransaction(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiResponse({ status: 200, description: 'Transaction deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async deleteTransaction(@Param('id') id: string) {
    return this.transactionsService.deleteTransaction(id);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get transaction statistics summary' })
  @ApiResponse({ status: 200, description: 'Transaction stats retrieved successfully' })
  async getTransactionStats() {
    return this.transactionsService.getTransactionStats();
  }
}