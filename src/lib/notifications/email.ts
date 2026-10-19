import "server-only";

import nodemailer from "nodemailer";
import { getRequiredServerEnvironment } from "@/lib/env";

export async function sendMaintenanceEmail(input: { to: string; bike: string; task: string; due: string; status: string; odometer: number; estimatedCost: number | null }) {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("SMTP_PORT must be a valid port number.");
  const secure = (process.env.SMTP_SECURE || "true").toLowerCase() === "true";
  const user = getRequiredServerEnvironment("SMTP_USER");
  const password = getRequiredServerEnvironment("SMTP_PASS");
  const from = getRequiredServerEnvironment("MAIL_FROM");
  const task = input.task.replace(/[\r\n]/g, " ");

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass: password } });
  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Bike maintenance reminder - ${task}`,
    text: [
      `Your ${task} maintenance is ${input.status}.`,
      "",
      `Bike: ${input.bike}`,
      `Due: ${input.due}`,
      `Current odometer: ${input.odometer.toLocaleString("en-IN")} km`,
      input.estimatedCost === null ? null : `Estimated cost: ₹${input.estimatedCost.toLocaleString("en-IN")}`,
      "",
      "Please check your Pitlane maintenance dashboard.",
    ].filter((line): line is string => line !== null).join("\n"),
  });
}