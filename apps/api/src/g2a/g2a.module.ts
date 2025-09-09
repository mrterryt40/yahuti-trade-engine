import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { G2AController } from './g2a.controller';
import { G2AService } from './g2a.service';

@Module({
  imports: [HttpModule],
  controllers: [G2AController],
  providers: [G2AService],
  exports: [G2AService],
})
export class G2AModule {}