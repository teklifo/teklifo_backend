import fs from "fs";
import path from "path";
import xml2js from "xml2js";
import prisma from "../config/db";
import cloudinary from "../config/cloudinary";
import logger from "../config/logger";
import {
  ProductType,
  ImageType,
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
      await parser.parseStringPromise(importXml),
      await parser.parseStringPromise(offersXml),
    ]);

    const importData = promises[0] as CommerceML_Import;
    const offersData = promises[1] as CommerceML_Offers;

    const externalIds: string[] = [];
    const productsData: ProductType[] = [];

    // Map through catalogs
    const catalogs = importData.КоммерческаяИнформация.Каталог;
    const onlyChanges = catalogs[0].СодержитТолькоИзменения
      ? catalogs[0].СодержитТолькоИзменения[0] === "true"
      : catalogs[0].$?.СодержитТолькоИзменения === "true";

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
        const productId = `${companyId}#${ids[0]}`;
        let characteristicId = "";
        if (ids.length > 1) characteristicId = ids[1];
        const externalId = productId + characteristicId;

        // Read images path
        const images: string[] = [];
        if (product.Картинка && product.Картинка.length > 0) {
          product.Картинка.map((e) => {
            images.push(e);
          });
        }

        productsData.push({
          companyId: companyId,
          externalId,
          productId,
          characteristicId,
          number: product.Артикул[0],
          barcode: product.ШтрихКод ? product.ШтрихКод[0] : "",
          name: product.Наименование[0],
          unit: product.БазоваяЕдиница[0].$.НаименованиеПолное,
          vat:
            product.СтавкиНалогов && product.СтавкиНалогов.length > 0
              ? product.СтавкиНалогов[0].СтавкаНалога[0].Ставка[0]
              : "",
          sellPrice: parseInt(productOffer.Цены[0].Цена[0].ЦенаЗаЕдиницу[0]),
          inStock: parseInt(productOffer.Количество[0]),
          images: images,
        });

        externalIds.push(externalId);
      });
    });

    // Find what products do already exit
    const existingProducts = await prisma.product.findMany({
      where: {
        externalId: { in: externalIds },
      },
      select: {
        externalId: true,
        images: true,
      },
    });

    // Upsert products data
    await Promise.all(
      productsData.map(async (productData) => {
        const images = productData.images;
        productData.images = undefined;

        await prisma.product.upsert({
          where: {
            externalId: productData.externalId,
          },
          create: productData,
          update: productData,
        });

        // Images will be uploaded in two cases:
        // 1. Product didn't have an commerceMl image before
        // 2. This exchange file contains only changes
        const existingProduct = existingProducts.find(
          (e) => e.externalId === productData.externalId
        );

        const existingCommerceMlImages = (
          (existingProduct?.images ?? []) as ImageType[]
        ).filter((i) => i.commerceMl === true);

        if (!images || (existingCommerceMlImages.length > 0 && !onlyChanges)) {
          return;
        }

        // Delete old images
        await Promise.all(
          existingCommerceMlImages.map(async (i) => {
            await cloudinary.uploader.destroy(i.id);
          })
        );

        // Upload new images
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
            commerceMl: true,
          };
        });

        // Update product with new images
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
    throw error;
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
    Promise.all(
      subfolders.map(async (subfolder) => {
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
        const exchangeFiles = await fs.promises.readdir(subfolderPath);
        const importFile = exchangeFiles.find(
          (e) => e.startsWith("import") && path.extname(e) === ".xml"
        );
        const offersFile = exchangeFiles.find(
          (e) => e.startsWith("offers") && path.extname(e) === ".xml"
        );

        if (importFile && offersFile) {
          // Read import.xml & offers.xml
          const data = await Promise.all([
            await fs.promises.readFile(
              `${subfolderPath}/${importFile}`,
              "utf8"
            ),
            await fs.promises.readFile(
              `${subfolderPath}/${offersFile}`,
              "utf8"
            ),
          ]);

          try {
            await readExchangeData(companyId, data[0], data[1]);
          } catch (error) {
            logger.error(`Error reading exchange files: ${error}`);
          }
        }

        await fs.promises.rm(subfolderPath, { recursive: true, force: true });
      })
    );
  });
};

export default readExchangeFiles;
