import { Module } from '@nestjs/common';
import { PayComponentsController } from './pay-components.controller';
import { PayComponentsService } from './pay-components.service';

@Module({
  controllers: [PayComponentsController],
  providers: [PayComponentsService],
  exports: [PayComponentsService]
})
export class PayComponentsModule {}
