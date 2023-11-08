import express, { Request, Response } from "express";
import prisma from "../../config/db";
import logger from "../../config/logger";

const router = express.Router();

// @route  GET api/companies
// @desc   Get list of all companies id
// @access Public
router.get("/companies", async (req: Request, res: Response) => {
  try {
    const result = await prisma.company.findMany({
      orderBy: {
        name: "desc",
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    return res.json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).send(req.t("serverError"));
  }
});

// @route  GET api/products
// @desc   Get list of all products id
// @access Public
router.get("/products", async (req: Request, res: Response) => {
  try {
    const result = await prisma.product.findMany({
      orderBy: {
        name: "desc",
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    return res.json(result);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).send(req.t("serverError"));
  }
});

export { router as seoRouter };
