import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import { MoreThan } from "typeorm";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import randomstring from "randomstring";
import { User } from "../../entities/User";
import emailSender from "../../config/nodemailer/emailSender";
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

// @route POST api/auth/create_reset_password_token
// @desc  Create reset password token
// @access Public
router.post(
  "/create_reset_password_token",
  [
    check("email")
      .isEmail()
      .withMessage((_, { req }) => req.t("invalidEmail")),
  ],
  async (req: Request, res: Response) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    try {
      // Find user by email address
      const user = await User.findOneBy({
        email: email.toLowerCase(),
      });

      // User not found
      if (!user) {
        return res.status(400).json({
          errors: [{ msg: req.t("noUserWithSuchEmail") }],
        });
      }

      // Generate unique reset password token
      const resetPasswordToken = randomstring.generate();
      const minutes = 30;
      const resetPasswordTokenExpires = new Date(
        new Date().getTime() + minutes * 60000
      );

      // Update user
      user.reset_password_token = resetPasswordToken;
      user.reset_password_token_expires = resetPasswordTokenExpires;
      await user.save();

      // Send password reset email
      await emailSender({
        emailType: "reset_password",
        subject: req.t("subjectResetPassword"),
        receivers: email,
        context: {
          resetPasswordToken,
        },
      });

      return res.send(req.t("resetPasswordEmailSent"));
    } catch (error) {
      logger.error(error.message);
      return res.status(500).send(req.t("serverError"));
    }
  }
);

// @route POST api/auth/check_reset_password_token
// @desc  Check reset password token
// @access Public
router.post(
  "/check_reset_password_token",
  [
    check("email")
      .isEmail()
      .withMessage((_, { req }) => req.t("invalidEmail")),
    check("resetPasswordToken")
      .notEmpty()
      .withMessage((_, { req }) => req.t("resetPasswordTokenIsRequired")),
  ],
  async (req: Request, res: Response) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { email, resetPasswordToken } = req.body;

    try {
      // Find user by reset password token
      const user = await User.findOneBy({
        email: email.toLowerCase(),
        reset_password_token: resetPasswordToken,
        reset_password_token_expires: MoreThan(new Date()),
      });

      // User not found
      if (!user) {
        return res.status(400).json({
          errors: [{ msg: req.t("invalidResetPasswordToken") }],
        });
      }

      return res.send(req.t("resetPasswordTokenIsValid"));
    } catch (error) {
      logger.error(error.message);
      return res.status(500).send(req.t("serverError"));
    }
  }
);

// @route POST api/auth/reset_password
// @desc  Resets users password
// @access Public
router.post(
  "/reset_password",
  [
    check("email")
      .isEmail()
      .withMessage((_, { req }) => req.t("invalidEmail")),
    check("resetPasswordToken")
      .exists()
      .notEmpty()
      .withMessage((_, { req }) => req.t("resetPasswordTokenIsRequired")),
    check("password")
      .notEmpty()
      .withMessage((_, { req }) => req.t("passwordRequired")),
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
      const { email, resetPasswordToken, password } = req.body;

      // Find user by reset password token
      const user = await User.findOneBy({
        email: email.toLowerCase(),
        reset_password_token: resetPasswordToken,
        reset_password_token_expires: MoreThan(new Date()),
      });

      // User not found
      if (!user) {
        return res.status(400).json({
          errors: [{ msg: req.t("invalidResetPasswordToken") }],
        });
      }

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update user
      user.password = hashedPassword;
      user.reset_password_token = null;
      user.reset_password_token_expires = new Date("0001-01-01");
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
  }
);

export { router as authRouter };
