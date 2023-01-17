import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { EmailType, EmailContextType } from "../../types/types";

export default (emailType: EmailType, context: EmailContextType) => {
  const filePath = path.join(__dirname, `./emails/${emailType}.html`);
  const source = fs.readFileSync(filePath, "utf-8").toString();
  const template = handlebars.compile(source);
  const html = template(context);

  return {
    text: "",
    html,
  };
};
