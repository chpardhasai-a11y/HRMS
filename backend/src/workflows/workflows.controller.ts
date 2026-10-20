import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import {
  CurrentUser,
  RequestUser,
} from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "./workflows.service";
import { FlowActorGuard } from "./flow.actor.guard";
import { FlowRuntime } from "./flow.runtime";
import { attachmentReadable, readableData, valueAt } from "./flow.rules";
import { templates } from "./flow.templates";
import { isAdmin, lock, requirePolicy } from "./flow.access";
import { ForbiddenException } from "@nestjs/common";
@Controller("workflows")
@UseGuards(JwtAuthGuard, FlowActorGuard)
export class WorkflowsController {
  constructor(
    private readonly service: WorkflowsService,
    private readonly runtime: FlowRuntime,
    private readonly db: PrismaService,
  ) {}
  @Get() list(@CurrentUser() u: RequestUser, @Query() q: any) {
    return this.service.list(u, q);
  }
  @Post() create(@CurrentUser() u: RequestUser, @Body() b: any) {
    return this.service.create(b, u);
  }
  @Get("templates") templates() {
    return templates();
  }
  @Get("lookups") lookups(@CurrentUser() u: RequestUser) {
    return this.service.lookups(u);
  }
  @Post("memberships") membership(
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.service.membership(b, u);
  }
  @Get("notifications") async notifications(@CurrentUser() u: RequestUser) {
    const notifications = await this.db.flowEvent.findMany({
      where: {
        companyId: u.companyId,
        type: "NOTIFICATION",
        detail: { path: ["recipients"], array_contains: [u.sub] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const read = await this.db.flowReceipt.findMany({
      where: {
        companyId: u.companyId,
        key: { startsWith: `notification:${u.sub}:` },
      },
    });
    const keys = new Set(read.map((r) => r.key));
    return notifications.filter(
      (n) => !keys.has(`notification:${u.sub}:${n.id}`),
    );
  }
  @Post("notifications/:id/read") async readNotification(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    const n = await this.db.flowEvent.findFirst({
      where: {
        id,
        companyId: u.companyId,
        type: "NOTIFICATION",
        detail: { path: ["recipients"], array_contains: [u.sub] },
      },
    });
    if (!n) throw new BadRequestException("Notification not found");
    return this.db.flowReceipt.upsert({
      where: {
        companyId_key: {
          companyId: u.companyId,
          key: `notification:${u.sub}:${id}`,
        },
      },
      create: { companyId: u.companyId, key: `notification:${u.sub}:${id}` },
      update: {},
    });
  }
  @Get("tasks") tasks(@CurrentUser() u: RequestUser, @Query() q: any) {
    return this.service.tasks(u, q);
  }
  @Post("tasks/:id/action") action(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.runtime.taskAction(id, b, u);
  }
  @Get("instances") instances(@CurrentUser() u: RequestUser, @Query() q: any) {
    return this.service.listInstances(u, q);
  }
  @Get("instances/:id") details(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.service.details(id, u);
  }
  @Post("instances/:id/actions") control(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.runtime.control(id, b, u);
  }
  @Get("monitoring") monitoring(@CurrentUser() u: RequestUser) {
    return this.service.monitoring(u);
  }
  @Get("reports.csv") async csv(
    @CurrentUser() u: RequestUser,
    @Res() res: any,
  ) {
    if (!isAdmin(u)) throw new ForbiddenException();
    const rows = await this.db.flowInstance.findMany({
      where: { companyId: u.companyId },
      include: { definition: { select: { name: true } }, version: true },
      take: 10000,
      orderBy: { createdAt: "desc" },
    });
    const fields = [
      ...new Set(
        rows.flatMap(
          (i) => (i.version.document as any).monitoring?.reportFields || [],
        ),
      ),
    ] as string[];
    const cell = (v: any) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const lines = [
      [
        "Execution",
        "Workflow",
        "Status",
        "State",
        "Started",
        "Completed",
        ...fields,
      ]
        .map(cell)
        .join(","),
      ...rows.map((i) => {
        const data = readableData(
          (i.version.document as any).fields,
          i.data,
          u.role,
        );
        return [
          i.id,
          i.definition.name,
          i.status,
          i.state,
          i.createdAt.toISOString(),
          i.completedAt?.toISOString(),
          ...fields.map((f) => {
            const value = valueAt(data, f);
            return typeof value === "object" ? JSON.stringify(value) : value;
          }),
        ]
          .map(cell)
          .join(",");
      }),
    ];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="workflow-report.csv"',
    );
    res.send(lines.join("\r\n"));
  }
  @Get("bindings") bindings(@CurrentUser() u: RequestUser) {
    return this.service.bindings(u);
  }
  @Post("bindings") bind(@CurrentUser() u: RequestUser, @Body() b: any) {
    return this.service.bind(b, u);
  }
  @Post("hr/:id/start") startHR(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.service.startHR(id, u);
  }
  @Get("connections") connections(@CurrentUser() u: RequestUser) {
    return this.service.connections(u);
  }
  @Post("connections") connection(
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.service.connection(b, u);
  }
  @Get("records") async records(
    @CurrentUser() u: RequestUser,
    @Query("type") type: string,
    @Query("instanceId") instanceId?: string,
    @Query("definitionId") definitionId?: string,
  ) {
    if (!isAdmin(u)) {
      let document: any;
      if (instanceId) {
        const i = await this.runtime.instance(this.db, instanceId, u);
        document = i.version.document;
      } else {
        const d = await this.db.flowDefinition.findFirst({
          where: {
            id: definitionId || "",
            companyId: u.companyId,
            status: "PUBLISHED",
          },
          include: {
            versions: {
              where: { number: { gt: 0 } },
              orderBy: { number: "desc" },
              take: 1,
            },
          },
        });
        if (!d?.versions[0])
          throw new ForbiddenException("Published workflow required");
        document = d.versions[0].document;
        requirePolicy(document, u, "starters");
      }
      const flatten = (fields: any[]): any[] =>
        fields.flatMap((f) => [
          f,
          ...(f.type === "section" ? flatten(f.fields || []) : []),
        ]);
      if (
        !type ||
        !flatten(document.fields).some(
          (f) =>
            f.type === "relationship" &&
            f.referenceType === type &&
            (!f.readRoles?.length || f.readRoles.includes(u.role)),
        )
      )
        throw new ForbiddenException("Reference data access denied");
    }
    const rows = await this.db.flowRecord.findMany({
      where: { companyId: u.companyId, ...(type ? { type } : {}) },
      take: 100,
    });
    return isAdmin(u)
      ? rows
      : rows.map((r) => ({
          id: r.id,
          type: r.type,
          data: {
            name: (r.data as any).name,
            summary: (r.data as any).summary,
          },
        }));
  }
  @Post("records") async record(@CurrentUser() u: RequestUser, @Body() b: any) {
    if (!isAdmin(u)) throw new ForbiddenException();
    if (!b.type || !b.data || !b.key)
      throw new BadRequestException("Record type, data and event key required");
    return this.db.$transaction(
      async (tx) => {
        await lock(tx, `record:${u.companyId}:${b.key}`);
        const receipt = await tx.flowReceipt.findUnique({
          where: {
            companyId_key: { companyId: u.companyId, key: `record:${b.key}` },
          },
        });
        if (receipt)
          return tx.flowRecord.findUnique({
            where: { id: receipt.instanceId! },
          });
        const r = await tx.flowRecord.create({
          data: { companyId: u.companyId, type: b.type, data: b.data },
        });
        await tx.flowReceipt.create({
          data: {
            companyId: u.companyId,
            key: `record:${b.key}`,
            instanceId: r.id,
          },
        });
        await this.runtime.emitRecord(tx, r, "record.created", u, b.key);
        return r;
      },
      { timeout: 20000 },
    );
  }
  @Put("records/:id") async updateRecord(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    if (!isAdmin(u)) throw new ForbiddenException();
    return this.db.$transaction(
      async (tx) => {
        await lock(tx, `record:${id}`);
        const r = await tx.flowRecord.findFirst({
          where: { id, companyId: u.companyId },
        });
        if (!r) throw new BadRequestException("Record not found");
        const result = await tx.flowRecord.updateMany({
          where: { id, companyId: u.companyId, revision: b.revision },
          data: { data: b.data, revision: { increment: 1 } },
        });
        if (!result.count)
          throw new BadRequestException("Record changed; refresh");
        await this.runtime.emitRecord(
          tx,
          { ...r, data: b.data, revision: r.revision + 1 },
          "record.updated",
          u,
          b.key || `${id}:${r.revision + 1}`,
        );
        return { success: true };
      },
      { timeout: 20000 },
    );
  }
  @Post("instances/:id/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @UploadedFile() file: any,
  ) {
    if (!id.startsWith("staged:")) await this.runtime.instance(this.db, id, u);
    if (!file) throw new BadRequestException("File required");
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!allowed.includes(file.mimetype))
      throw new BadRequestException("Unsupported file type");
    const key = randomUUID(),
      root =
        process.env.WORKFLOW_UPLOAD_DIR ||
        join(process.cwd(), "private-workflow-files");
    await mkdir(root, { recursive: true, mode: 0o700 });
    await writeFile(join(root, key), file.buffer, { mode: 0o600, flag: "wx" });
    return this.db.flowAttachment.create({
      data: {
        companyId: u.companyId,
        instanceId: id,
        uploadedBy: u.sub,
        name: file.originalname.replace(/[^a-zA-Z0-9_. -]/g, "_").slice(0, 180),
        mime: file.mimetype,
        size: file.size,
        storageKey: key,
      },
      select: { id: true, name: true, mime: true, size: true },
    });
  }
  @Post("attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 20 * 1024 * 1024, files: 1 },
    }),
  )
  stagedUpload(@CurrentUser() u: RequestUser, @UploadedFile() file: any) {
    return this.upload(`staged:${u.sub}`, u, file);
  }
  @Get("attachments/:id") async download(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Res() res: any,
  ) {
    const f = await this.db.flowAttachment.findFirst({
      where: { id, companyId: u.companyId },
    });
    if (!f) throw new BadRequestException("Attachment not found");
    if (f.instanceId !== `staged:${u.sub}`) {
      const i = await this.runtime.instance(this.db, f.instanceId, u);
      if (!attachmentReadable(i.version.document.fields, i.data, f.id, u.role))
        throw new ForbiddenException("Attachment field access denied");
    }
    res.setHeader("Content-Type", f.mime);
    res.setHeader("Content-Disposition", `attachment; filename="${f.name}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(
      await readFile(
        join(
          process.env.WORKFLOW_UPLOAD_DIR ||
            join(process.cwd(), "private-workflow-files"),
          f.storageKey,
        ),
      ),
    );
  }
  @Get(":id/form") async formDefinition(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    const d = await this.db.flowDefinition.findFirst({
      where: { id, companyId: u.companyId, status: "PUBLISHED" },
      include: {
        versions: {
          where: { number: { gt: 0 } },
          orderBy: { number: "desc" },
          take: 1,
        },
      },
    });
    if (!d?.versions[0])
      throw new BadRequestException("Published form not found");
    const doc = d.versions[0].document as any;
    requirePolicy(doc, u, "starters");
    if (
      !["form", "manual"].includes(
        doc.nodes.find((n: any) => n.type === "trigger")?.config.event,
      )
    )
      throw new BadRequestException("This workflow starts from an event");
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      fields: doc.fields.filter(
        (f: any) => !f.readRoles?.length || f.readRoles.includes(u.role),
      ),
    };
  }
  @Get(":id") get(@Param("id") id: string, @CurrentUser() u: RequestUser) {
    return this.service.get(id, u);
  }
  @Put(":id") update(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.service.update(id, b, u);
  }
  @Delete(":id") archive(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.service.archive(id, u);
  }
  @Post(":id/duplicate") duplicate(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.service.duplicate(id, u);
  }
  @Post(":id/validate") validate(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
  ) {
    return this.service.validate(id, u);
  }
  @Post(":id/publish") publish(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.service.publish(id, b, u);
  }
  @Post(":id/test") test(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.service.test(id, b, u);
  }
  @Post(":id/start") start(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    return this.runtime.start(id, u, b);
  }
  @Post(":id/form") async form(
    @Param("id") id: string,
    @CurrentUser() u: RequestUser,
    @Body() b: any,
  ) {
    const d = await this.db.flowDefinition.findFirst({
      where: { id, companyId: u.companyId },
      include: {
        versions: {
          where: { number: { gt: 0 } },
          orderBy: { number: "desc" },
          take: 1,
        },
      },
    });
    if (
      !["form", "manual"].includes(
        (d?.versions[0]?.document as any)?.nodes.find(
          (n: any) => n.type === "trigger",
        )?.config.event,
      )
    )
      throw new BadRequestException(
        "Workflow does not accept form submissions",
      );
    return this.runtime.start(id, u, b, "form");
  }
}
@Controller("workflow-webhooks")
export class WorkflowWebhookController {
  constructor(
    private readonly db: PrismaService,
    private readonly runtime: FlowRuntime,
  ) {}
  @Post(":id") async receive(
    @Param("id") id: string,
    @Headers("x-workflow-timestamp") timestamp: string,
    @Headers("x-workflow-signature") signature: string,
    @Headers("x-workflow-event") event: string,
    @Body() b: any,
  ) {
    const secret = process.env.WORKFLOW_WEBHOOK_SECRET;
    if (
      !secret ||
      !timestamp ||
      Math.abs(Date.now() - Number(timestamp)) > 300000 ||
      !event ||
      !signature ||
      !/^[a-f0-9]{64}$/i.test(signature)
    )
      throw new ForbiddenException("Invalid webhook authentication");
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${id}.${event}.${JSON.stringify(b)}`)
      .digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
      throw new ForbiddenException("Invalid webhook authentication");
    const d = await this.db.flowDefinition.findUnique({
      where: { id },
      include: {
        versions: {
          where: { number: { gt: 0 } },
          orderBy: { number: "desc" },
          take: 1,
        },
      },
    });
    const doc = d?.versions[0]?.document as any;
    if (
      !d ||
      doc?.nodes.find((n: any) => n.type === "trigger")?.config.event !==
        "webhook"
    )
      throw new BadRequestException("Webhook workflow not found");
    const user = await this.db.user.findFirst({
      where: { id: d.createdBy, companyId: d.companyId, isActive: true },
    });
    if (!user) throw new ForbiddenException();
    return this.runtime.start(
      id,
      {
        sub: user.id,
        companyId: d.companyId,
        email: user.email,
        role: user.role,
      },
      { data: b, key: `webhook:${id}:${event}` },
      "webhook",
    );
  }
}
