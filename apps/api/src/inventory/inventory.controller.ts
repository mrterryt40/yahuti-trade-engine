import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import type { InventoryItem, ReissueRequest, RefundRequest, InvalidateRequest, PaginationParams } from '@yahuti/contracts';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  @ApiResponse({ status: 200, description: 'Inventory items retrieved successfully' })
  async getInventory(@Query() pagination: PaginationParams) {
    return this.inventoryService.getInventory(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiResponse({ status: 200, description: 'Inventory item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async getInventoryById(@Param('id') id: string) {
    return this.inventoryService.getInventoryById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created successfully' })
  async createInventory(@Body() item: Partial<InventoryItem>) {
    return this.inventoryService.createInventory(item);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item updated successfully' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async updateInventory(@Param('id') id: string, @Body() updates: Partial<InventoryItem>) {
    return this.inventoryService.updateInventory(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async deleteInventory(@Param('id') id: string) {
    return this.inventoryService.deleteInventory(id);
  }

  @Post(':id/reissue')
  @ApiOperation({ summary: 'Reissue inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item reissued successfully' })
  async reissueInventory(@Param('id') id: string, @Body() request: ReissueRequest) {
    return this.inventoryService.reissueInventory(id, request);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process refund for inventory item' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async refundInventory(@Param('id') id: string, @Body() request: RefundRequest) {
    return this.inventoryService.refundInventory(id, request);
  }

  @Post(':id/invalidate')
  @ApiOperation({ summary: 'Invalidate inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item invalidated successfully' })
  async invalidateInventory(@Param('id') id: string, @Body() request: InvalidateRequest) {
    return this.inventoryService.invalidateInventory(id, request);
  }
}