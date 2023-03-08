import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Company } from "../entities/Company";
import { Item } from "../entities/Item";
import logger from "../utils/logger";
import {
  DATA_BASE_HOST,
  DATA_BASE_PORT,
  DATA_BASE_USERNAME,
  DATA_BASE_PASSWORD,
  DATA_BASE_NAME,
} from "../utils/secrets";

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

AppDataSource.initialize()
  .then(() => logger.info("Connected to database..."))
  .catch((error) => {
    logger.error("Error during Data Source initialization", error);
  });

export default AppDataSource;
