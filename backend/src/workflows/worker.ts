import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { FlowWorker } from "./flow.worker";
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });
  const worker = app.get(FlowWorker);
  let stopping = false;
  for (const signal of ["SIGTERM", "SIGINT"])
    process.on(signal, () => {
      stopping = true;
    });
  while (!stopping) {
    try {
      const count = await worker.tick();
      if (!count) await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      console.error("Workflow worker could not poll the database");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  await app.close();
}
main().catch(() => {
  console.error("Workflow worker startup failed");
  process.exitCode = 1;
});
