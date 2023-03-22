import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import { User } from "../../entities/User";
import { Company } from "../../entities/Company";
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
    check("type").isIn(["physical", "entity"]),
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
      const user = await User.findOneBy({ id: userId });
      if (!user || !user.is_active) {
        return res.status(400).json({
          errors: [
            {
              msg: req.t("userNotFound"),
            },
          ],
        });
      }

      const { name, tin, type, logo_url, description, contacts, socials } =
        req.body;

      // Check if company is unique
      const existingCompany = await Company.findOneBy({
        tin,
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

      const company = Company.create({
        name,
        tin,
        type,
        logo_url,
        description,
        contacts,
        socials,
        users: [user],
      });

      await company.save();

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
    const [result, total] = await Company.findAndCount({
      order: { name: "DESC" },
      take: limit,
      skip: startIndex,
    });

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

const getPaginationData = (
  startIndex: number,
  page: number,
  limit: number,
  total: number
) => {
  const pagination = {
    skipped: 0,
    current: 0,
    total: 0,
  };

  if (startIndex > 0) {
    pagination.skipped = Math.ceil(startIndex / limit);
  }
  pagination.current = page;
  pagination.total = Math.ceil(total / limit);

  return pagination;
};

export { router as companyRouter };
