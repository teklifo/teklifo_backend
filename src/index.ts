import express from "express";
import mongoose from "mongoose";
import logger from "./utils/logger";
import { MONGODB_URI } from "./utils/secrets";

mongoose.set("strictQuery", false);

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info("MongoDB connected...");
  })
  .catch((error) => {
    logger.error(
      `MongoDB connection error. Please make sure MongoDB is running. ${error}`
    );
  });

const app = express();
