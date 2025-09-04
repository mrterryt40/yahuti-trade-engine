import { Module } from '@nestjs/common';
import { HuntController } from './hunt.controller';
import { HuntService } from './hunt.service';

@Module({
  controllers: [HuntController],
  providers: [HuntService],
  exports: [HuntService],
})
export class HuntModule {}