import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import checkFileExists from "./checkFileExists";
import prisma from "../config/db";
import logger from "../config/logger";
import { CommerceML_Каталог } from "../types/types";

const readExchangeData = async (importXml: string, offersXml: string) => {
  const parser = new xml2js.Parser();

  try {
    // Retrieve data from plain xml
    const promises = await Promise.all([
      parser.parseStringPromise(importXml),
      parser.parseStringPromise(offersXml),
    ]);

    const importData = promises[0];
    const offersData = promises[1];

    const externalIds: string[] = [];
    const productsData: any[] = [];

    // Map through catalogs
    const catalogs = importData.КоммерческаяИнформация.Каталог;
    catalogs.forEach((catalog: CommerceML_Каталог) => {
      const products = catalog.Товары;

      products.forEach((productElement) => {
        const product = productElement.Товар[0];

        const ids = product.Ид[0].split("#");
        const externalId = ids[0];
        let characteristicId = "";
        if (ids.length > 1) characteristicId = ids[1];

        productsData.push({
          externalId,
          characteristicId,
          number: product.Артикул[0],
          barcode: product.ШтрихКод ? product.ШтрихКод[0] : "",
          name: product.Наименование[0],
          unit: product.БазоваяЕдиница[0]._,
          vat:
            product.СтавкиНалогов && product.СтавкиНалогов.length > 0
              ? product.СтавкиНалогов[0].СтавкаНалога[0].Ставка[0]
              : "",
          images: [],
        });

        externalIds.push(externalId);
      });
    });

    console.log(productsData);

    // Find what products do already exit
    const existingProducts = await prisma.product.findMany({
      where: {
        externalId: { in: externalIds },
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    logger.error("Error reading exchange files:", error);
  }
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

      // Check that exchange files do exists
      const filesExist =
        (await checkFileExists(`${subfolderPath}/import.xml`)) &&
        (await checkFileExists(`${subfolderPath}/offers.xml`));
      if (!filesExist) {
        return;
      }

      // Read import.xml & offers.xml
      const data = await Promise.all([
        fs.promises.readFile(`${subfolderPath}/import.xml`, "utf8"),
        fs.promises.readFile(`${subfolderPath}/offers.xml`, "utf8"),
      ]);

      readExchangeData(data[0], data[1]);
    });
  });
};

export default readExchangeFiles;
