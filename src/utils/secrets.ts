import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  logger.debug("Using .env file to supply config environment variables");
  dotenv.config({ path: ".env" });
}

export const ENVIRONMENT = process.env.NODE_ENV;

export const PORT = process.env["PORT"] ?? "5000";

export const DATA_BASE_HOST = process.env["DATA_BASE_HOST"] ?? "localhost";
export const DATA_BASE_PORT = parseInt(process.env["DATA_BASE_PORT"] ?? "5432");
export const DATA_BASE_USERNAME = process.env["DATA_BASE_USERNAME"] ?? "";
export const DATA_BASE_PASSWORD = process.env["DATA_BASE_PASSWORD"] ?? "";
export const DATA_BASE_NAME = process.env["DATA_BASE_NAME"] ?? "";

export const MAILGUN_API_KEY = process.env["MAILGUN_API_KEY"] ?? "";
export const MAILGUN_DOMAIN = process.env["MAILGUN_DOMAIN"] ?? "";
export const MAILGUN_HOST = process.env["MAILGUN_HOST"] ?? "";
