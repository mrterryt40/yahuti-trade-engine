import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlaybooksService } from './playbooks.service';
import type { Playbook, CreatePlaybookRequest, UpdatePlaybookRequest, ActivatePlaybookRequest, PaginationParams } from '@yahuti/contracts';

@ApiTags('Playbooks')
@Controller('playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all playbooks' })
  @ApiResponse({ status: 200, description: 'Playbooks retrieved successfully' })
  async getPlaybooks(@Query() pagination: PaginationParams) {
    return this.playbooksService.getPlaybooks(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get playbook by ID' })
  @ApiResponse({ status: 200, description: 'Playbook retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Playbook not found' })
  async getPlaybookById(@Param('id') id: string): Promise<Playbook> {
    return this.playbooksService.getPlaybookById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new playbook' })
  @ApiResponse({ status: 201, description: 'Playbook created successfully' })
  async createPlaybook(@Body() request: CreatePlaybookRequest): Promise<Playbook> {
    return this.playbooksService.createPlaybook(request);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update playbook' })
  @ApiResponse({ status: 200, description: 'Playbook updated successfully' })
  @ApiResponse({ status: 404, description: 'Playbook not found' })
  async updatePlaybook(@Param('id') id: string, @Body() request: UpdatePlaybookRequest): Promise<Playbook> {
    return this.playbooksService.updatePlaybook(id, request);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete playbook' })
  @ApiResponse({ status: 200, description: 'Playbook deleted successfully' })
  @ApiResponse({ status: 404, description: 'Playbook not found' })
  async deletePlaybook(@Param('id') id: string) {
    return this.playbooksService.deletePlaybook(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate playbook' })
  @ApiResponse({ status: 200, description: 'Playbook activated successfully' })
  async activatePlaybook(@Param('id') id: string) {
    return this.playbooksService.activatePlaybook(id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate playbook YAML' })
  @ApiResponse({ status: 200, description: 'Playbook validated successfully' })
  async validatePlaybook(@Param('id') id: string) {
    return this.playbooksService.validatePlaybook(id);
  }

  @Get('active/summary')
  @ApiOperation({ summary: 'Get active playbooks summary' })
  @ApiResponse({ status: 200, description: 'Active playbooks summary retrieved successfully' })
  async getActivePlaybooksSummary() {
    return this.playbooksService.getActivePlaybooksSummary();
  }
}