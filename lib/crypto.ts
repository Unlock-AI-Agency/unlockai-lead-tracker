import { createHash, randomBytes } from "crypto";

export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(projectSlug: string): string {
  const random = randomBytes(24).toString("hex");
  return `ulk_${projectSlug}_${random}`;
}
