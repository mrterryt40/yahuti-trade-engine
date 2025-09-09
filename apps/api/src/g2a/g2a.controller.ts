import { Controller, Get, Post, Put, Param, Query, Body, Logger } from '@nestjs/common';
import { G2AService, G2AProductsResponse, G2AProduct, G2AOrder, G2AOrderDetails } from './g2a.service';

@Controller('g2a')
export class G2AController {
  private readonly logger = new Logger(G2AController.name);

  constructor(private readonly g2aService: G2AService) {}

  @Get('products')
  async getProducts(
    @Query('page') page?: string,
    @Query('minQty') minQty?: string,
    @Query('minPriceFrom') minPriceFrom?: string,
    @Query('minPriceTo') minPriceTo?: string,
    @Query('includeOutOfStock') includeOutOfStock?: string,
    @Query('id') id?: string,
  ): Promise<G2AProductsResponse> {
    const params = {
      page: page ? parseInt(page) : undefined,
      minQty: minQty ? parseInt(minQty) : undefined,
      minPriceFrom: minPriceFrom ? parseFloat(minPriceFrom) : undefined,
      minPriceTo: minPriceTo ? parseFloat(minPriceTo) : undefined,
      includeOutOfStock: includeOutOfStock === 'true',
      id,
    };

    return this.g2aService.getProducts(params);
  }

  @Get('products/top')
  async getTopProducts(@Query('limit') limit?: string): Promise<G2AProduct[]> {
    const productLimit = limit ? parseInt(limit) : 10;
    return this.g2aService.getTopProducts(productLimit);
  }

  @Get('products/category/:category')
  async getProductsByCategory(@Param('category') category: string): Promise<G2AProduct[]> {
    return this.g2aService.getProductsByCategory(category);
  }

  @Post('orders')
  async createOrder(
    @Body() body: { 
      product_id: string; 
      max_price?: number; 
      currency?: string 
    }
  ): Promise<G2AOrder> {
    return this.g2aService.createOrder(
      body.product_id, 
      body.max_price, 
      body.currency
    );
  }

  @Get('orders/:id/details')
  async getOrderDetails(@Param('id') orderId: string): Promise<G2AOrderDetails> {
    return this.g2aService.getOrderDetails(orderId);
  }

  @Put('orders/:id/pay')
  async payOrder(@Param('id') orderId: string) {
    return this.g2aService.payOrder(orderId);
  }

  @Get('orders/:id/key')
  async getOrderKey(@Param('id') orderId: string) {
    return this.g2aService.getOrderKey(orderId);
  }

  @Get('dashboard-stats')
  async getDashboardStats() {
    try {
      const [topProducts, steamProducts, totalProducts] = await Promise.all([
        this.g2aService.getTopProducts(5),
        this.g2aService.getProductsByCategory('Steam'),
        this.g2aService.getProducts({ page: 1 })
      ]);

      return {
        totalProducts: totalProducts.total,
        topProducts: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          price: p.minPrice,
          platform: p.platform,
          thumbnail: p.thumbnail,
          availableToBuy: p.availableToBuy,
          qty: p.qty
        })),
        platformBreakdown: {
          Steam: steamProducts.length,
          // Add more platforms as needed
        },
        averagePrice: topProducts.reduce((sum, p) => sum + p.minPrice, 0) / topProducts.length || 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get dashboard stats', error);
      return {
        totalProducts: 0,
        topProducts: [],
        platformBreakdown: {},
        averagePrice: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Failed to load G2A data'
      };
    }
  }
}