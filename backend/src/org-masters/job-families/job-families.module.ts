import { Module } from '@nestjs/common';
import { JobFamiliesController } from './job-families.controller';
import { JobFamiliesService } from './job-families.service';

@Module({
  controllers: [JobFamiliesController],
  providers: [JobFamiliesService],
  exports: [JobFamiliesService]
})
export class JobFamiliesModule {}
