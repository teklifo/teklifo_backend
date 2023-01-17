import nodemailer from "nodemailer";
import mailgunTransport from "nodemailer-mailgun-transport";
import emailTemplates from "./emailTemplates";
import logger from "../../utils/logger";
import {
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
  MAILGUN_HOST,
} from "../../utils/secrets";
import { EmailType, EmailContextType } from "../../types/types";

interface EmailParametersType {
  emailType: EmailType;
  subject: string;
  receivers: string;
  context: EmailContextType;
}

export default async (params: EmailParametersType) => {
  const { emailType, subject, receivers, context } = params;
  const { text, html } = emailTemplates(emailType, context);
  const mailgunTransporter = mailgunTransport({
    auth: {
      api_key: MAILGUN_API_KEY,
      domain: MAILGUN_DOMAIN,
    },
    host: MAILGUN_HOST,
  });
  const transporter = nodemailer.createTransport(mailgunTransporter);

  const info = await transporter.sendMail({
    from: "Tekliff <info@tekliff.az>",
    to: receivers,
    subject,
    text,
    html,
  });

  logger.info(`Email sent: ${info.messageId}`);

  return info;
};
