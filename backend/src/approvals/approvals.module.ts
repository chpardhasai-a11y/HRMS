import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [MailModule, WorkflowsModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
