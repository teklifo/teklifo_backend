import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import prisma from "../../config/db";
import getPaginationData from "../../utils/getPaginationData";
import logger from "../../utils/logger";

const router = express.Router();

// @route  POST api/companies
// @desc   Create company
// @access Private
router.post(
  "/",
  [
    check("name").notEmpty(),
    check("tin").notEmpty(),
    check("entityType").isIn(["physical", "entity"]),
    check("description").isLength({ min: 200 }),
    check("shortDescription").isLength({ min: 200 }),
    passport.authenticate("jwt", { session: false }),
  ],
  async (req: Request, res: Response) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    try {
      // Find user
      const userId = req.user?.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) {
        return res.status(400).json({
          errors: [
            {
              msg: req.t("userNotFound"),
            },
          ],
        });
      }

      const {
        name,
        tin,
        entityType,
        image,
        description,
        shortDescription,
        contacts,
        socials,
      } = req.body;

      // Check if tin is unique
      const existingCompany = await prisma.company.findUnique({
        where: { tin },
      });
      if (existingCompany) {
        return res.status(400).json({
          errors: [
            {
              msg: req.t("tinIsNotUnique"),
            },
          ],
        });
      }

      const company = await prisma.company.create({
        data: {
          name,
          tin,
          entityType,
          image,
          description,
          shortDescription,
          contacts,
          socials,
          users: {
            create: {
              user: {
                connect: {
                  id: userId,
                },
              },
            },
          },
        },
      });

      return res.json(company);
    } catch (error) {
      logger.error(error.message);
      return res.status(500).send(req.t("serverError"));
    }
  }
);

// @route  GET api/companies
// @desc   Get list of companies
// @access Public
router.get("/", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10);
  const limit = parseInt(req.query.limit as string, 10);

  const startIndex = (page - 1) * limit;

  if (!page || !limit)
    return res.json({ message: req.t("pageAndlimitAreRequired") });

  try {
    const [total, result] = await prisma.$transaction([
      prisma.company.count(),
      prisma.company.findMany({
        take: limit,
        skip: startIndex,
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

// @route GET api/posts/:id
// @desc  Get single company
// @access Public
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const company = await prisma.company.findUnique({
      where: { id: parseInt(id) },
    });

    // Company not found
    if (!company) {
      return res
        .status(404)
        .json({ errors: [{ msg: req.t("invalidCompanyId") }] });
    }

    return res.json(company);
  } catch (error) {
    logger.error(error.message);
    return res.status(500).send(req.t("serverError"));
  }
});

export { router as companyRouter };
