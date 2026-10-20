import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import * as https from "https";
import * as nodemailer from "nodemailer";
@Injectable()
export class FlowIntegrations {
  constructor(private readonly config: ConfigService) {}
  private key() {
    const raw = this.config.get<string>("WORKFLOW_ENCRYPTION_KEY");
    if (!raw || !/^[a-f0-9]{64}$/i.test(raw))
      throw new BadRequestException(
        "WORKFLOW_ENCRYPTION_KEY must contain 64 hexadecimal characters",
      );
    return Buffer.from(raw, "hex");
  }
  encrypt(secret: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((v) => v.toString("base64"))
      .join(".");
  }
  decrypt(secret: string) {
    const [iv, tag, data] = secret
      .split(".")
      .map((v) => Buffer.from(v, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", this.key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  }
  private publicIP(ip: string) {
    if (isIP(ip) === 4) {
      const [a, b] = ip.split(".").map(Number);
      return !(
        a === 0 ||
        a === 10 ||
        a === 127 ||
        a >= 224 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 168 || b === 0)) ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 198 && (b === 18 || b === 19))
      );
    }
    // Restrict IPv6 to global unicast; excludes mapped, local and link-local addresses.
    return (
      isIP(ip) === 6 &&
      /^[23]/i.test(ip) &&
      !ip.toLowerCase().startsWith("2001:db8:")
    );
  }
  async request(
    connection: any,
    path: string,
    method: string,
    body: any,
    idempotencyKey: string,
  ) {
    const base = new URL(connection.baseUrl),
      url = new URL(path || "", base);
    if (
      url.protocol !== "https:" ||
      url.origin !== base.origin ||
      url.username ||
      url.password
    )
      throw new BadRequestException(
        "Integrations require HTTPS on the configured origin",
      );
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !this.publicIP(a.address)))
      throw new BadRequestException(
        "Integration target is not a public address",
      );
    const address = addresses[0];
    const secret = this.decrypt(connection.encryptedSecret);
    const payload = JSON.stringify(body || {});
    return new Promise<{ status: number; body: any }>((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: method || "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
            ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
          },
          lookup: ((_host: any, _options: any, callback: any) =>
            callback(null, address.address, address.family)) as any,
          timeout: 15000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let bytes = 0;
          res.on("data", (chunk) => {
            bytes += chunk.length;
            if (bytes > 1024 * 1024) {
              res.destroy();
              reject(new Error("Integration response exceeds 1 MB"));
            } else chunks.push(chunk);
          });
          res.on("end", () => {
            const status = res.statusCode || 500;
            if (status < 200 || status >= 300)
              return reject(new Error(`Integration returned HTTP ${status}`));
            let parsed: any;
            try {
              parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              parsed = null;
            }
            resolve({ status, body: parsed });
          });
        },
      );
      req.on("timeout", () =>
        req.destroy(
          new Error("Integration timed out; outcome may be ambiguous"),
        ),
      );
      req.on("error", () =>
        reject(
          new Error("Integration transport failed; outcome may be ambiguous"),
        ),
      );
      req.end(payload);
    });
  }
  async email(to: string, subject: string, text: string, key: string) {
    const host = this.config.get<string>("SMTP_HOST"),
      user = this.config.get<string>("SMTP_USER"),
      pass = this.config.get<string>("SMTP_PASS");
    if (!host || !user || !pass)
      throw new BadRequestException("SMTP is not configured");
    const transport = nodemailer.createTransport({
      host,
      port: Number(this.config.get("SMTP_PORT") || 587),
      secure: this.config.get("SMTP_SECURE") === "true",
      auth: { user, pass },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    await transport.sendMail({
      from: this.config.get("SMTP_FROM") || user,
      to,
      subject,
      text,
      messageId: `<${key}@workflow.local>`,
    });
  }
}
