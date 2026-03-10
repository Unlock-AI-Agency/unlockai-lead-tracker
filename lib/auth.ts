import { NextRequest } from "next/server";

export function authenticate(req: NextRequest): { valid: boolean; clientId?: string } {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { valid: false };

  // API keys are formatted as: ulk_{clientId}_{secret}
  const expectedKey = process.env.API_KEY;
  if (!expectedKey || apiKey !== expectedKey) return { valid: false };

  const clientId = process.env.CLIENT_ID ?? "default";
  return { valid: true, clientId };
}
