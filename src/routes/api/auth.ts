import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import { MoreThan } from "typeorm";
import passport from "passport";
import jwt from "jsonwebtoken";
import { User } from "../../entities/User";
import { JWT_SECRET } from "../../utils/secrets";
import logger from "../../utils/logger";

const router = express.Router();

type LocalSignInError =
  | {
      message: "invalid_credentials" | "email_not_verified";
    }
  | undefined;

// @route GET api/auth
// @desc  Get user info via token
// @access Public
router.get("/", async (req, res, next) => {
  passport.authenticate("jwt", (err, user, info) => {
    if (err) {
      logger.error(err.message);
      return res.status(500).send(req.t("serverError"));
    }
    if (info) {
      return res.status(400).json({ errors: [info] });
    }
    return res.json(user);
  })(req, res, next);
});

// @route POST api/auth
// @desc  Authenticate user & get user
// @access Public
router.post(
  "/",
  [
    check("email")
      .isEmail()
      .withMessage((_, { req }) => req.t("invalidEmail")),
    check("password")
      .notEmpty()
      .withMessage((_, { req }) => req.t("passwordRequired")),
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
      "local-signin",
      (err, user, signInError: LocalSignInError) => {
        if (err) {
          logger.error(err.message);
          return res.status(500).send(req.t("serverError"));
        }

        if (signInError?.message === "email_not_verified") {
          return res.status(400).json({
            errors: [
              {
                param: "email",
                msg: req.t("emailNotVerified"),
              },
            ],
          });
        }

        if (signInError?.message === "invalid_credentials") {
          return res.status(400).json({
            errors: [
              {
                param: "email",
                msg: req.t("invalidCredentials"),
              },
            ],
          });
        }

        const payload = {
          user: {
            id: user.id,
          },
        };
        const token = jwt.sign(payload, JWT_SECRET);
        return res.json({ token });
      }
    )(req, res, next);
  }
);

// @route POST api/auth/verification/
// @desc  Email verification
// @access Public
router.post("/verification", async (req, res) => {
  try {
    const { email, activationToken } = req.body;

    // Find user by activation token
    const user = await User.findOneBy({
      email: email.toLowerCase(),
      is_active: false,
      activation_token: activationToken,
      activation_token_expires: MoreThan(new Date()),
    });

    // User not found
    if (!user) {
      return res.status(400).json({
        errors: [{ msg: req.t("invalidActivationToken") }],
      });
    }

    // Update user
    user.is_active = true;
    user.activation_token = null;
    user.activation_token_expires = new Date("0001-01-01");
    await user.save();

    // Login user
    const payload = {
      user: {
        id: user.id,
      },
    };
    const token = jwt.sign(payload, JWT_SECRET);
    return res.json({ token });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).send(req.t("serverError"));
  }
});

export { router as authRouter };
