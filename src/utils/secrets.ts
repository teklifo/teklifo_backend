import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  logger.debug("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
}

export const ENVIRONMENT = process.env.NODE_ENV;

export const PORT = process.env["PORT"] ?? "5000";

export const JWT_SECRET = process.env["JWT_SECRET"] ?? "";

export const MAILGUN_API_KEY = process.env["MAILGUN_API_KEY"] ?? "";
export const MAILGUN_DOMAIN = process.env["MAILGUN_DOMAIN"] ?? "";
export const MAILGUN_HOST = process.env["MAILGUN_HOST"] ?? "";

export const CLIENT_URL = process.env["CLIENT_URL"] ?? "";
