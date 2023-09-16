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

export const EMAIL_SERVER_HOST = process.env["EMAIL_SERVER_HOST"] ?? "";
export const EMAIL_SERVER_PORT = process.env["EMAIL_SERVER_PORT"] ?? "";
export const EMAIL_SERVER_USER = process.env["EMAIL_SERVER_USER"] ?? "";
export const EMAIL_SERVER_PASSWORD = process.env["EMAIL_SERVER_PASSWORD"] ?? "";
export const EMAIL_FROM = process.env["EMAIL_FROM"] ?? "";

export const CLIENT_URL = process.env["CLIENT_URL"] ?? "";

export const CLOUDINARY_CLOUD_NAME = process.env["CLOUDINARY_CLOUD_NAME"] ?? "";
export const CLOUDINARY_API_KEY = process.env["CLOUDINARY_API_KEY"] ?? "";
export const CLOUDINARY_API_SECRET = process.env["CLOUDINARY_API_SECRET"] ?? "";
