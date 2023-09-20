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

export type CommerceML_СтавкаНалога = {
  СтавкаНалога: [
    {
      Наименование: string[];
      Ставка: string[];
    }
  ];
};

export type CommerceML_Группы = {
  Ид: string[];
};

export type CommerceML_Товары = {
  Товар: {
    Ид: string[];
    ШтрихКод?: string[];
    Артикул: string[];
    Наименование: string[];
    БазоваяЕдиница: { _: string }[];
    СтавкиНалогов?: CommerceML_СтавкаНалога[];
    Группы: CommerceML_Группа[];
    Картинка?: string[];
  }[];
};

export type CommerceML_Каталог = {
  Товары: CommerceML_Товары[];
};
