import express from "express";
import { MoreThan } from "typeorm";
import jwt from "jsonwebtoken";
import { User } from "../../entities/User";
import { JWT_SECRET } from "../../utils/secrets";
import logger from "../../utils/logger";

const router = express.Router();

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
