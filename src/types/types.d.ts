import { ValidationError } from "express-validator";

export type EmailType = "email_verification" | "reset_password";

export interface EmailContextType {
  [key: string]: string;
}

export interface ValidationExceptionType {
  status: number;
  message: string;
  errors: ValidationError[];
}

declare global {
  namespace Express {
    interface User {
      id: number;
      name: string;
      email: string;
    }
  }
}
