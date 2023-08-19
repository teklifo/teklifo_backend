import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { EmailType, EmailContextType } from "../../types/types";

export default async function emailTemplate(
  emailType: EmailType,
  context: EmailContextType,
  locale: string
) {
  let localeFolder = "az";
  if (locale.toLocaleLowerCase().startsWith("ru")) localeFolder = "ru";

  const filePath = path.join(
    process.cwd(),
    `src/config/nodemailer/emails/${localeFolder}/${emailType}.html`
  );

  const source = (await fs.promises.readFile(filePath, "utf-8")).toString();
  const template = handlebars.compile(source);
  const html = template(context);

  return {
    text: "",
    html,
  };
}
