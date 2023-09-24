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
  commerceMl?: boolean;
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

export type ProductType = {
  externalId: string;
  productId: string;
  characteristicId: string;
  number: string;
  barcode: string;
  name: string;
  unit: string;
  vat: string;
  sellPrice: number;
  inStock: number;
  images?: string[];
  companyId: number;
};

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
    БазоваяЕдиница: { $: { НаименованиеПолное: string } }[];
    СтавкиНалогов?: CommerceML_СтавкаНалога[];
    Группы: CommerceML_Группа[];
    Картинка?: string[];
  }[];
};

export type CommerceML_Каталог = {
  Товары: CommerceML_Товары[];
  $?: {
    СодержитТолькоИзменения: string;
  };
  СодержитТолькоИзменения?: string[];
};

export type CommerceML_Import = {
  КоммерческаяИнформация: {
    Каталог: CommerceML_Каталог[];
  };
};

export type CommerceML_Цена = {
  Цена: {
    ЦенаЗаЕдиницу: string[];
    Валюта: string[];
  }[];
};

export type CommerceML_Предложения = {
  Предложение: {
    Ид: string[];
    ШтрихКод?: string[];
    Артикул: string[];
    Наименование: string[];
    БазоваяЕдиница: { _: string }[];
    Цены: CommerceML_Цена[];
    Количество: string[];
  }[];
};

export type CommerceML_ПакетПредложений = {
  Предложения: CommerceML_Предложения[];
};

export type CommerceML_Offers = {
  КоммерческаяИнформация: {
    ПакетПредложений: CommerceML_ПакетПредложений[];
  };
};
