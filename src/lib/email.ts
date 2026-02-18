import nodemailer from 'nodemailer';
import { prisma } from './prisma';

export async function getTransporter() {
  const settings = await prisma.emailSettings.findUnique({
    where: { id: 'singleton' },
  });

  if (!settings || !settings.smtpHost) {
    return null;
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
}

export async function sendEmail(to: string, subject: string, body: string) {
  const transporter = await getTransporter();
  if (!transporter) {
    throw new Error('Email not configured');
  }

  const settings = await prisma.emailSettings.findUnique({
    where: { id: 'singleton' },
  });

  return transporter.sendMail({
    from: `"${settings?.fromName || 'Super Bowl Squares'}" <${settings?.fromEmail || 'noreply@localhost'}>`,
    to,
    subject,
    text: body,
  });
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '');
}
