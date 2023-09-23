import express from "express";
import passport from "passport";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import cors from "cors";
import schedule from "node-schedule";
import "./config/passport";
import { userRouter } from "./routes/api/users";
import { authRouter } from "./routes/api/auth";
import { companyRouter } from "./routes/api/companies";
import { commerceMlRouter } from "./routes/api/commerce_ml";
import { productRouter } from "./routes/api/products";
import readExchangeFiles from "./utils/readExchangeFiles";
import logger from "./config/logger";
import { PORT } from "./config/secrets";

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
  try {
    app.use(express.json());
    app.use(middleware.handle(i18next));
    app.use(passport.initialize());
    app.use(cors());

    app.use("/api/users", userRouter);
    app.use("/api/auth", authRouter);
    app.use("/api/companies", companyRouter);
    app.use("/api/commerce_ml", commerceMlRouter);
    app.use("/api/products", productRouter);

    // Read exchange files every 15 minutes
    schedule.scheduleJob("*/15 * * * *", function () {
      readExchangeFiles();
    });

    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error.message);
  }
};

main();
