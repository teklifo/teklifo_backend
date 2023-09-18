import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import randomstring from "randomstring";
import prisma from "../../config/db";
import sendEmail from "../../config/nodemailer/sendEmail";
import { JWT_SECRET, CLIENT_URL } from "../../config/secrets";
import logger from "../../config/logger";

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
      .withMessage((_, { req }) => req.t("passwordIsRequired")),
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

        const token = jwt.sign(user, JWT_SECRET);
        return res.json({ token });
      }
    )(req, res, next);
  }
);

// @route POST api/auth/verification/
// @desc  Email verification
// @access Public
router.post("/verification", async (req, res) => {
  const { activationToken } = req.body;

  const conditions = {
    isActive: false,
    activationToken,
    activationTokenExpires: {
      gte: new Date(),
    },
  };

  try {
    // Find user by activation password token
    const existingUser = await prisma.user.findUnique({
      where: conditions,
    });

    // User not found
    if (!existingUser) {
      return res.status(400).json({
        errors: [{ msg: req.t("invalidActivationToken") }],
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: conditions,
      data: {
        isActive: true,
        activationToken: null,
        activationTokenExpires: new Date("0001-01-01"),
      },
    });

    // Login user
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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

    // Generate unique reset password token
    const resetPasswordToken = randomstring.generate();
    const minutes = 30;
    const resetPasswordTokenExpires = new Date(
      new Date().getTime() + minutes * 60000
    );

    const conditions = {
      email: email.toLowerCase(),
    };

    try {
      // Find user by email address
      const existingUser = await prisma.user.findUnique({
        where: conditions,
      });

      // User not found
      if (!existingUser) {
        return res.status(400).json({
          errors: [{ msg: req.t("noUserWithSuchEmail") }],
        });
      }

      // Update user
      await prisma.user.update({
        where: conditions,
        data: {
          resetPasswordToken,
          resetPasswordTokenExpires,
        },
      });

      // Send password reset email
      await sendEmail({
        emailType: "reset_password",
        subject: req.t("subjectResetPassword"),
        receivers: email,
        context: {
          url: `${CLIENT_URL}/set_new_password?resetPasswordToken=${resetPasswordToken}`,
        },
        locale: req.language,
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

    const { resetPasswordToken } = req.body;

    try {
      // Find user by reset password token
      const user = await prisma.user.findUnique({
        where: {
          resetPasswordToken: resetPasswordToken,
          resetPasswordTokenExpires: {
            gte: new Date(),
          },
        },
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
    check("resetPasswordToken")
      .exists()
      .notEmpty()
      .withMessage((_, { req }) => req.t("resetPasswordTokenIsRequired")),
    check("password")
      .notEmpty()
      .withMessage((_, { req }) => req.t("passwordIsRequired")),
  ],
  async (req: Request, res: Response) => {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    const { resetPasswordToken, password } = req.body;

    const conditions = {
      isActive: false,
      resetPasswordToken,
      resetPasswordTokenExpires: {
        gte: new Date(),
      },
    };

    try {
      // Find user by reset password token
      const existingUser = await prisma.user.findUnique({
        where: conditions,
      });

      // User not found
      if (!existingUser) {
        return res.status(400).json({
          errors: [{ msg: req.t("invalidResetPasswordToken") }],
        });
      }

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update user
      const user = await prisma.user.update({
        where: conditions,
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordTokenExpires: new Date("0001-01-01"),
        },
      });

      // Login user
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
