import "server-only";

import { getRequiredServerEnvironment } from "@/lib/env";

export async function sendTelegramMaintenanceMessage(input: { chatId: string; bike: string; task: string; due: string; status: string; odometer: number; estimatedCost: number | null }) {
  const token = getRequiredServerEnvironment("TELEGRAM_BOT_TOKEN");
  const message = [
    "Bike maintenance reminder",
    "",
    `Bike: ${input.bike}`,
    `Task: ${input.task}`,
    `Due: ${input.due}`,
    `Status: ${input.status}`,
    `Current odometer: ${input.odometer.toLocaleString("en-IN")} km`,
    input.estimatedCost === null ? null : `Estimated cost: ₹${input.estimatedCost.toLocaleString("en-IN")}`,
    "",
    "Please check your Pitlane maintenance dashboard.",
  ].filter((line): line is string => line !== null).join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: input.chatId, text: message }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Telegram delivery failed with HTTP ${response.status}.`);
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!result.ok) throw new Error(result.description || "Telegram rejected the message.");
}