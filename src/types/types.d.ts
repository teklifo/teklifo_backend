import { Prisma } from "@prisma/client";
import { ValidationError } from "express-validator";

export type EmailType = "email_verification" | "reset_password";

export type EmailContextType = {
  [key: string]: string;
};

export type ValidationExceptionType = {
  status: number;
  message: string;
  errors: ValidationError[];
};

type ImageType = {
  id: string;
  url: string;
};

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
      isActive: boolean;
      image: Prisma.JsonValue?;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}
