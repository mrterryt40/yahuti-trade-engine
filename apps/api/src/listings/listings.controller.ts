import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import type { Listing, RepriceRequest, PaginationParams } from '@yahuti/contracts';

@ApiTags('Listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all listings' })
  @ApiResponse({ status: 200, description: 'Listings retrieved successfully' })
  async getListings(@Query() pagination: PaginationParams) {
    return this.listingsService.getListings(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async getListingById(@Param('id') id: string) {
    return this.listingsService.getListingById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new listing' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  async createListing(@Body() listing: Partial<Listing>) {
    return this.listingsService.createListing(listing);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update listing' })
  @ApiResponse({ status: 200, description: 'Listing updated successfully' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async updateListing(@Param('id') id: string, @Body() updates: Partial<Listing>) {
    return this.listingsService.updateListing(id, updates);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete listing' })
  @ApiResponse({ status: 200, description: 'Listing deleted successfully' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async deleteListing(@Param('id') id: string) {
    return this.listingsService.deleteListing(id);
  }

  @Post('reprice')
  @ApiOperation({ summary: 'Reprice listings' })
  @ApiResponse({ status: 200, description: 'Listings repriced successfully' })
  async repriceListings(@Body() request: RepriceRequest) {
    return this.listingsService.repriceListings(request);
  }
}