import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import logger from "../../utils/logger";

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

export { router as userRouter };
