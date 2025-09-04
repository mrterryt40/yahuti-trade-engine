import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ControlService } from './control.service';
import type { GlobalControl } from '@yahuti/contracts';

@ApiTags('Control')
@Controller('control')
export class ControlController {
  constructor(private readonly controlService: ControlService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start all automation modules' })
  @ApiResponse({ status: 200, description: 'System started successfully' })
  async start() {
    return this.controlService.startSystem();
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause all automation modules' })
  @ApiResponse({ status: 200, description: 'System paused successfully' })
  async pause() {
    return this.controlService.pauseSystem();
  }

  @Post('kill')
  @ApiOperation({ summary: 'Emergency stop - kill all automation immediately' })
  @ApiResponse({ status: 200, description: 'Emergency stop executed successfully' })
  async kill() {
    return this.controlService.killSystem();
  }
}