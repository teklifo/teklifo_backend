import express from "express";
import passport from "passport";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import cors from "cors";
import "./config/passport";
import { userRouter } from "./routes/api/users";
import { authRouter } from "./routes/api/auth";
import { companyRouter } from "./routes/api/companies";
import logger from "./utils/logger";
import { PORT } from "./utils/secrets";

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

    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error.message);
  }
};

main();
