import express, { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../config/db";
import getPaginationData from "../../utils/getPaginationData";
import logger from "../../config/logger";

const router = express.Router();

// @route  GET api/products
// @desc   Get list of products
// @access Public
router.get("/", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10);
  const limit = parseInt(req.query.limit as string, 10);

  const startIndex = (page - 1) * limit;

  if (!page || !limit)
    return res.status(400).json({ message: req.t("pageAndlimitAreRequired") });

  // Filters
  const filters: Prisma.ProductWhereInput = {};
  if (req.query.companyId)
    filters.companyId = parseInt(req.query.companyId.toString(), 10);

  try {
    const [total, result] = await prisma.$transaction([
      prisma.product.count(),
      prisma.product.findMany({
        take: limit,
        skip: startIndex,
        where: filters,
        orderBy: {
          name: "desc",
        },
      }),
    ]);

    const pagination = getPaginationData(startIndex, page, limit, total);

    return res.json({
      result,
      pagination,
    });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).send(req.t("serverError"));
  }
});

// @route GET api/products/:id
// @desc  Get single product
// @access Public
router.get("/:id", async (req, res) => {
  const { id } = req.params ?? "0";

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: { company: true },
    });

    // Product not found
    if (!product) {
      return res
        .status(404)
        .json({ errors: [{ msg: req.t("invalidCompanyId") }] });
    }

    return res.json(product);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).send(req.t("serverError"));
  }
});

export { router as productRouter };
