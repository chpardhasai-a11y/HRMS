import { Module } from '@nestjs/common';
import { TimeZonesController } from './time-zones.controller';
import { TimeZonesService } from './time-zones.service';

@Module({
  controllers: [TimeZonesController],
  providers: [TimeZonesService],
  exports: [TimeZonesService]
})
export class TimeZonesModule {}
