import express from "express";
import { DataSource } from "typeorm";
import passport from "passport";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import cors from "cors";
import "./config/passport";
import { userRouter } from "./routes/api/users";
import { authRouter } from "./routes/api/auth";
import { companyRouter } from "./routes/api/companies";
import { User } from "./entities/User";
import { Company } from "./entities/Company";
import { Item } from "./entities/Item";
import logger from "./utils/logger";
import {
  PORT,
  DATA_BASE_HOST,
  DATA_BASE_PORT,
  DATA_BASE_USERNAME,
  DATA_BASE_PASSWORD,
  DATA_BASE_NAME,
} from "./utils/secrets";

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "az",
    backend: {
      loadPath: "./src/locales/{{lng}}/translation.json",
    },
  });

const app = express();

const main = async () => {
  const AppDataSource = new DataSource({
    type: "postgres",
    host: DATA_BASE_HOST,
    port: DATA_BASE_PORT,
    username: DATA_BASE_USERNAME,
    password: DATA_BASE_PASSWORD,
    database: DATA_BASE_NAME,
    entities: [User, Company, Item],
    synchronize: true,
  });

  try {
    await AppDataSource.initialize();
    logger.info("Connected to database...");

    app.use(express.json());
    app.use(middleware.handle(i18next));
    app.use(passport.initialize());
    app.use(cors());

    app.use("/api/users", userRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/companies", companyRouter);

    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error.message);
  }
};

main();
