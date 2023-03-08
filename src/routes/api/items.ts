import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { In } from "typeorm";
import passport from "passport";
import AppDataSource from "../../config/appDataSource";
import { Item } from "../../entities/Item";
import { User } from "../../entities/User";
import { Company } from "../../entities/Company";
import logger from "../../utils/logger";

interface ItemStructure {
  name: string;
  external_id: string;
  number: string;
  is_service?: boolean;
  sale_price?: number;
  purchase_price?: number;
  picture_url?: string;
}

interface CreateItemsBody {
  company_id: number;
  items: ItemStructure[];
}

const router = express.Router();

// @route  POST api/items
// @desc   Create items
// @access Private
router.post(
  "/",
  [
    check("items.*.external_id")
      .notEmpty()
      .withMessage((_, { req }) => req.t("itemExternalIdIsRequired")),
    check("items.*.name")
      .notEmpty()
      .withMessage((_, { req }) => req.t("itemNameIsRequired")),
    check("company_id")
      .notEmpty()
      .withMessage((_, { req }) => req.t("itemCompanyIsRequired")),
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

    const body = req.body as CreateItemsBody;
    const items = body.items;
    const company_id = body.company_id;

    try {
      // Check if company exists
      const company = await Company.findOneBy({
        id: company_id,
      });
      if (!company) {
        return res.json({ message: req.t("invalidCompanyId") });
      }

      // Check if user is a member of a company
      const userId = req.user?.id;
      const user = await User.findOne({
        where: { id: userId },
        relations: ["companies"],
      });

      if (!user?.companies.find((element) => element.id === company_id)) {
        return res.json({ message: req.t("userIsNotAMember") });
      }

      // Check if items are unique
      const existingItems = await Item.find({
        where: {
          external_id: In(
            items.map((item) => `${company_id}_${item.external_id}`)
          ),
        },
      });
      if (existingItems.length > 0) {
        return res.json({
          message: `${req.t("externalIdIsNotUnique")}: ${existingItems
            .map((element) => element.external_id)
            .join(", ")}`,
        });
      }

      const data = await AppDataSource.createQueryBuilder()
        .insert()
        .into(Item)
        .values(
          items.map((item) => {
            return {
              ...item,
              external_id: `${company.id}_${item.external_id}`,
              company: company,
            };
          })
        )
        .execute();

      return res.json(data.raw);
    } catch (error) {
      logger.error(error.message);
      return res.status(500).send(req.t("serverError"));
    }
  }
);

export { router as itemRouter };
