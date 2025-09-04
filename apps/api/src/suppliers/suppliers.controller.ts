import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import type { Supplier, BlacklistSupplierRequest, PaginationParams } from '@yahuti/contracts';

@ApiTags('Suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async getSuppliers(@Query() pagination: PaginationParams) {
    return this.suppliersService.getSuppliers(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async getSupplierById(@Param('id') id: string): Promise<Supplier> {
    return this.suppliersService.getSupplierById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  async createSupplier(@Body() supplier: Partial<Supplier>): Promise<Supplier> {
    return this.suppliersService.createSupplier(supplier);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async updateSupplier(@Param('id') id: string, @Body() updates: Partial<Supplier>): Promise<Supplier> {
    return this.suppliersService.updateSupplier(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async deleteSupplier(@Param('id') id: string) {
    return this.suppliersService.deleteSupplier(id);
  }

  @Post(':id/blacklist')
  @ApiOperation({ summary: 'Blacklist supplier' })
  @ApiResponse({ status: 200, description: 'Supplier blacklisted successfully' })
  async blacklistSupplier(@Param('id') id: string, @Body() request: { reason: string }) {
    return this.suppliersService.blacklistSupplier(id, request.reason);
  }

  @Post(':id/whitelist')
  @ApiOperation({ summary: 'Remove supplier from blacklist' })
  @ApiResponse({ status: 200, description: 'Supplier whitelisted successfully' })
  async whitelistSupplier(@Param('id') id: string) {
    return this.suppliersService.whitelistSupplier(id);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get supplier performance analytics' })
  @ApiResponse({ status: 200, description: 'Supplier performance analytics retrieved successfully' })
  async getSupplierPerformance() {
    return this.suppliersService.getSupplierPerformance();
  }
}