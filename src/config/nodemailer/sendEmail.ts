import nodemailer from "nodemailer";
import emailTemplate from "./emailTemplate";
import logger from "../logger";
import {
  EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT,
  EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD,
  EMAIL_FROM,
} from "../secrets";
import { EmailType, EmailContextType } from "../../types/types";

interface EmailParametersType {
  emailType: EmailType;
  subject: string;
  receivers: string;
  context: EmailContextType;
  locale: string;
}

export default async function sendEmail(params: EmailParametersType) {
  const { emailType, subject, receivers, context, locale } = params;
  const { text, html } = await emailTemplate(emailType, context, locale);

  const transporter = nodemailer.createTransport({
    host: EMAIL_SERVER_HOST,
    port: Number(EMAIL_SERVER_PORT),
    auth: {
      user: EMAIL_SERVER_USER,
      pass: EMAIL_SERVER_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to: receivers,
    subject,
    text,
    html,
  });

  logger.info(`Email sent: ${info.messageId}`);

  return info;
}
