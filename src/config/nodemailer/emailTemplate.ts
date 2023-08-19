import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { EmailType, EmailContextType } from "../../types/types";

export default async function emailTemplate(
  emailType: EmailType,
  context: EmailContextType,
  locale: string
) {
  const filePath = path.join(
    process.cwd(),
    `src/config/nodemailer/emails/${locale}/${emailType}.html`
  );

  const source = (await fs.promises.readFile(filePath, "utf-8")).toString();
  const template = handlebars.compile(source);
  const html = template(context);

  return {
    text: "",
    html,
  };
}
