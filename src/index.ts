import express from 'express';
import { DataSource } from 'typeorm';
import passport from 'passport';
import { User } from './entities/User';
import { Company } from './entities/Company';
import { Item } from './entities/Item';
import logger from './utils/logger';
import {
  PORT,
  DATA_BASE_HOST,
  DATA_BASE_PORT,
  DATA_BASE_USERNAME,
  DATA_BASE_PASSWORD,
  DATA_BASE_NAME,
} from './utils/secrets';

const app = express();

const main = async () => {
  const AppDataSource = new DataSource({
    type: 'postgres',
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
    logger.info('Connected to database...');

    app.use(express.json());
    app.use(passport.initialize());

    app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error.message);
  }
};

main();
