import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import logger from "../config/logger";

const readExchangeData = (importData: string, offersData: string) => {
  const parser = new xml2js.Parser();
  parser.parseString(importData, function (err, result) {
    console.dir(result);
  });
  parser.parseString(offersData, function (err, result) {
    console.dir(result);
  });
};

const readExchangeFiles = () => {
  const folderPath = `${process.cwd()}/exchange_files/`;

  // Read content of an exchange folder.
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      logger.error("Error reading folder:", err);
      return;
    }

    // Read all subfolders. Each folder represents a different company.
    const subfolders = files.filter((file) => {
      const filePath = path.join(folderPath, file);
      return fs.statSync(filePath).isDirectory();
    });

    // Map all subfolders.
    subfolders.forEach(async (subfolder) => {
      const subfolderPath = `${folderPath}/${subfolder}`;

      // Read import.xml & offers.xml
      const importData = await fs.promises.readFile(
        `${subfolderPath}/import.xml`,
        "utf8"
      );
      const offersData = await fs.promises.readFile(
        `${subfolderPath}/offers.xml`,
        "utf8"
      );

      readExchangeData(importData, offersData);
    });
  });
};

export default readExchangeFiles;
