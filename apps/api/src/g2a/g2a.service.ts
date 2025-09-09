import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface G2AProduct {
  id: string;
  name: string;
  type: string;
  slug: string;
  qty: number;
  minPrice: number;
  retail_min_price: number;
  retailMinBasePrice: number;
  availableToBuy: boolean;
  thumbnail: string;
  smallImage: string;
  coverImage: string;
  images: string[];
  updated_at: string;
  release_date: string;
  region: string;
  developer: string;
  publisher: string;
  platform: string;
  categories: Array<{ id: string; name: string }>;
}

export interface G2AProductsResponse {
  total: number;
  page: number;
  docs: G2AProduct[];
}

export interface G2AOrder {
  order_id: string;
  price: number;
  currency: string;
}

export interface G2AOrderDetails {
  status: string;
  price: number;
  currency: string;
}

@Injectable()
export class G2AService {
  private readonly logger = new Logger(G2AService.name);
  private readonly baseUrl = 'https://sandboxapi.g2a.com/v1';
  private readonly clientId = 'qdaiciDiyMaTjxMt';
  private readonly apiKey = '74026b3dc2c6db6a30a73e71cdb138b1e1b5eb7a97ced46689e2d28db1050875';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private getAuthHeaders() {
    return {
      'Authorization': `${this.clientId}, ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getProducts(params?: {
    page?: number;
    minQty?: number;
    minPriceFrom?: number;
    minPriceTo?: number;
    includeOutOfStock?: boolean;
    id?: string;
  }): Promise<G2AProductsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.minQty) queryParams.append('minQty', params.minQty.toString());
      if (params?.minPriceFrom) queryParams.append('minPriceFrom', params.minPriceFrom.toString());
      if (params?.minPriceTo) queryParams.append('minPriceTo', params.minPriceTo.toString());
      if (params?.includeOutOfStock) queryParams.append('includeOutOfStock', 'true');
      if (params?.id) queryParams.append('id', params.id);

      const url = `${this.baseUrl}/products${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await firstValueFrom(
        this.httpService.get<G2AProductsResponse>(url, {
          headers: this.getAuthHeaders(),
        }),
      );

      this.logger.log(`Retrieved ${response.data.docs.length} products from G2A API`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch products from G2A API', error);
      throw new Error('Failed to fetch G2A products');
    }
  }

  async createOrder(productId: string, maxPrice?: number, currency: string = 'EUR'): Promise<G2AOrder> {
    try {
      const payload: any = {
        product_id: productId,
        currency,
      };

      if (maxPrice) {
        payload.max_price = maxPrice;
      }

      const response = await firstValueFrom(
        this.httpService.post<G2AOrder>(`${this.baseUrl}/order`, payload, {
          headers: this.getAuthHeaders(),
        }),
      );

      this.logger.log(`Created order ${response.data.order_id} for product ${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create order for product ${productId}`, error);
      throw new Error('Failed to create G2A order');
    }
  }

  async getOrderDetails(orderId: string): Promise<G2AOrderDetails> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<G2AOrderDetails>(`${this.baseUrl}/order/details/${orderId}`, {
          headers: this.getAuthHeaders(),
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get order details for ${orderId}`, error);
      throw new Error('Failed to get order details');
    }
  }

  async payOrder(orderId: string): Promise<{ status: boolean; transaction_id: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.baseUrl}/order/pay/${orderId}`, {}, {
          headers: {
            ...this.getAuthHeaders(),
            'Content-Length': '0',
          },
        }),
      );

      this.logger.log(`Payment processed for order ${orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to process payment for order ${orderId}`, error);
      throw new Error('Failed to process payment');
    }
  }

  async getOrderKey(orderId: string): Promise<{ key: string; isFile: boolean }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/order/key/${orderId}`, {
          headers: this.getAuthHeaders(),
        }),
      );

      this.logger.log(`Retrieved key for order ${orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get key for order ${orderId}`, error);
      throw new Error('Failed to get order key');
    }
  }

  async getTopProducts(limit: number = 10): Promise<G2AProduct[]> {
    try {
      const response = await this.getProducts({ page: 1, minQty: 1 });
      return response.docs.slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to fetch top products', error);
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<G2AProduct[]> {
    try {
      const response = await this.getProducts({ page: 1 });
      return response.docs.filter(product => 
        product.categories.some(cat => 
          cat.name.toLowerCase().includes(category.toLowerCase())
        )
      );
    } catch (error) {
      this.logger.error(`Failed to fetch products for category ${category}`, error);
      return [];
    }
  }
}