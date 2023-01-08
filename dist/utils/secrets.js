import logger from "./logger.js";
import dotenv from "dotenv";
import fs from "fs";
if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";
export const MONGODB_URI = prod
    ? process.env["MONGODB_URI"]
    : process.env["MONGODB_URI_LOCAL"];
//# sourceMappingURL=secrets.js.map