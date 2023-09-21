import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import checkFileExists from "./checkFileExists";
import prisma from "../config/db";
import cloudinary from "../config/cloudinary";
import logger from "../config/logger";
import {
  ProductType,
  CommerceML_Import,
  CommerceML_Offers,
} from "../types/types";

const readExchangeData = async (
  companyId: number,
  importXml: string,
  offersXml: string
) => {
  const parser = new xml2js.Parser();

  try {
    // Retrieve data from plain xml
    const promises = await Promise.all([
      parser.parseStringPromise(importXml),
      parser.parseStringPromise(offersXml),
    ]);

    const importData = promises[0] as CommerceML_Import;
    const offersData = promises[1] as CommerceML_Offers;

    const productsData: ProductType[] = [];

    // Map through catalogs
    const catalogs = importData.КоммерческаяИнформация.Каталог;

    const offers =
      offersData.КоммерческаяИнформация.ПакетПредложений[0].Предложения[0]
        .Предложение;

    catalogs.forEach((catalog) => {
      const products = catalog.Товары[0].Товар;

      products.forEach((product) => {
        // Find product offer by id
        const productOffer = offers.find(
          (offer) => offer.Ид[0] === product.Ид[0]
        );
        if (!productOffer) return;

        // Generate externalId and characteristicId
        const ids = product.Ид[0].split("#");
        const externalId = `${companyId}#${ids[0]}`;
        let characteristicId = "";
        if (ids.length > 1) characteristicId = ids[1];

        // Read images path
        const images: string[] = [];
        if (product.Картинка && product.Картинка.length > 0) {
          images.push(product.Картинка[0]);
        }

        productsData.push({
          companyId: companyId,
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
          sellPrice: parseInt(productOffer.Цены[0].Цена[0].ЦенаЗаЕдиницу[0]),
          inStock: parseInt(productOffer.Количество[0]),
          images: images,
        });
      });
    });

    // Upsert products data
    await Promise.all(
      productsData.map(async (productData) => {
        const images = productData.images;
        productData.images = [];

        await prisma.product.upsert({
          where: {
            externalId: productData.externalId,
          },
          create: productData,
          update: productData,
        });

        // Upload images after successful upsert
        const results = await Promise.all(
          images.map(async (image) => {
            const path = `${process.cwd()}/exchange_files/${companyId}/${image}`;
            return await cloudinary.uploader.upload(path);
          })
        );

        const uploadedImages = results.map((result) => {
          return {
            id: result.public_id,
            url: result.secure_url,
          };
        });

        await prisma.product.update({
          where: {
            externalId: productData.externalId,
          },
          data: {
            images: uploadedImages,
          },
        });
      })
    );
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

      // Find a company by id.
      const companyId = parseInt(subfolder);
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!company) {
        // No company was found
        return;
      }

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

      readExchangeData(companyId, data[0], data[1]);
    });
  });
};

export default readExchangeFiles;
