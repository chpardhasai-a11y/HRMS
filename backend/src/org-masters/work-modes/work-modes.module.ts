import { Module } from '@nestjs/common';
import { WorkModesController } from './work-modes.controller';
import { WorkModesService } from './work-modes.service';

@Module({
  controllers: [WorkModesController],
  providers: [WorkModesService],
  exports: [WorkModesService]
})
export class WorkModesModule {}
