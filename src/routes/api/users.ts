import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import cloudinary from "../../config/cloudinary";
import prisma from "../../config/db";
import logger from "../../config/logger";

const router = express.Router();

type LocalSignUpError = { message: "email_is_taken" } | undefined;

// @route  POST api/users
// @desc   Register user
// @access Public
router.post(
  "/",
  [
    check("name")
      .notEmpty()
      .withMessage((_, { req }) => req.t("nameIsRequired")),
    check("email")
      .isEmail()
      .withMessage((_, { req }) => req.t("invalidEmail")),
    check("password")
      .isLength({
        min: 6,
      })
      .withMessage((_, { req }) => req.t("invalidPassword")),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    return passport.authenticate(
      "local-signup",
      (err, user, signUpError: LocalSignUpError) => {
        if (err) {
          logger.error(err.message);
          return res.status(500).send(req.t("serverError"));
        }
        if (signUpError?.message === "email_is_taken") {
          return res.status(400).json({
            errors: [
              {
                param: "email",
                msg: req.t("emailIsTaken"),
              },
            ],
          });
        }

        return res.json({ user });
      }
    )(req, res, next);
  }
);

// @route  PUT api/users/:id
// @desc   Update user
// @access Private
router.put(
  "/:id",
  [
    check("name")
      .notEmpty()
      .withMessage((_, { req }) => req.t("companyNameIsRequired")),
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

    const { id } = req.params ?? "0";

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
      });
      if (!user || !user.isActive) {
        return res.status(400).json({
          errors: [
            {
              msg: req.t("userNotFound"),
            },
          ],
        });
      }

      // User can change only his own record
      if (user.id !== req.user?.id) {
        return res.status(400).json({
          errors: [
            {
              msg: req.t("usersDoNotMatch"),
            },
          ],
        });
      }

      const { name, image } = req.body;

      const updatedUser = await prisma.user.update({
        where: {
          id: parseInt(id),
        },
        data: {
          name,
          image,
        },
      });

      // Delete an old image
      if (user.image) {
        try {
          await cloudinary.uploader.destroy((user.image as { id: string }).id);
        } catch (error) {
          logger.error(error);
        }
      }

      return res.json(updatedUser);
    } catch (error) {
      logger.error(error.message);
      return res.status(500).send(req.t("serverError"));
    }
  }
);

export { router as userRouter };
