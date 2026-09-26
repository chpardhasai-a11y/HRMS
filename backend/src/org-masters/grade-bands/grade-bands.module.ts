import { Module } from '@nestjs/common';
import { GradeBandsController } from './grade-bands.controller';
import { GradeBandsService } from './grade-bands.service';

@Module({
  controllers: [GradeBandsController],
  providers: [GradeBandsService],
  exports: [GradeBandsService]
})
export class GradeBandsModule {}
