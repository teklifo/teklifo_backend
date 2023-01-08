import express from "express";
import mongoose from "mongoose";
import { MONGODB_URI } from "./utils/secrets.js";
console.log(MONGODB_URI);
mongoose.set("strictQuery", false);
mongoose
    .connect(MONGODB_URI)
    .then(() => {
    /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
})
    .catch((error) => {
    console.log(`MongoDB connection error. Please make sure MongoDB is running. ${error}`);
    // process.exit();
});
const app = express();
//# sourceMappingURL=index.js.map