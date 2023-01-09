import { DataSource } from "typeorm";
import { User } from "./entities/User";
import logger from "./utils/logger";
import {
  DATA_BASE_HOST,
  DATA_BASE_PORT,
  DATA_BASE_USERNAME,
  DATA_BASE_PASSWORD,
  DATA_BASE_NAME,
} from "./utils/secrets";

const main = async () => {
  const AppDataSource = new DataSource({
    type: "postgres",
    host: DATA_BASE_HOST,
    port: DATA_BASE_PORT,
    username: DATA_BASE_USERNAME,
    password: DATA_BASE_PASSWORD,
    database: DATA_BASE_NAME,
    entities: [User],
    synchronize: true,
  });

  try {
    await AppDataSource.initialize();
    logger.info("Connected to database...");
  } catch (error) {
    logger.error(error);
  }
};

main();
