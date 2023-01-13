import express, { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import passport from "passport";
import logger from "../../utils/logger";

const router = express.Router();

// @route  POST api/users
// @desc   Register user
// @access Public
router.post(
  "/",
  [
    check("name", "Name is required").notEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters long").isLength({
      min: 6,
    }),
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
      (err, user, validationError: "email_is_taken" | undefined) => {
        if (err) {
          logger.error(err.message);
          return res.status(500).send("Server error...");
        }
        if (validationError === "email_is_taken") {
          return res.status(400).json({
            errors: [
              {
                param: "email",
                msg: "This email is already taken",
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
