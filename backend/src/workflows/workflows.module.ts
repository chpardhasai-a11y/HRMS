import { TeamsModule } from "../org-masters/teams/teams.module";
import { Module } from "@nestjs/common";
import {
  WorkflowsController,
  WorkflowWebhookController,
} from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";
import { FlowRuntime } from "./flow.runtime";
import { FlowAssignment } from "./flow.assignment";
import { FlowIntegrations } from "./flow.integrations";
import { FlowActorGuard } from "./flow.actor.guard";
import { FlowWorker } from "./flow.worker";
@Module({
  imports: [TeamsModule],
  controllers: [WorkflowsController, WorkflowWebhookController],
  providers: [
    WorkflowsService,
    FlowRuntime,
    FlowAssignment,
    FlowIntegrations,
    FlowWorker,
    FlowActorGuard,
  ],
  exports: [WorkflowsService, FlowRuntime, FlowWorker],
})
export class WorkflowsModule {}
