import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import passport from "passport";
import jwt from "jsonwebtoken";
import checkFileExists from "../../utils/checkFileExists";
import prisma from "../../config/db";
import { JWT_SECRET } from "../../config/secrets";
import logger from "../../config/logger";

const router = express.Router();

const getResponseMessage = (
  result: "success" | "error",
  token?: string,
  error?: string
) => {
  return `${result}${token ? `\nJWT\n${token}` : ""}${
    error ? `\n${error}` : ""
  }`;
};

// @route  GET api/commerce_ml
// @desc   User authentication
// @access Public
router.get(
  "/:companyId",
  async (req: Request, res: Response, next: NextFunction) => {
    const mode = req.query.mode ?? "init";

    if (mode === "init") {
      return res.send("zip=no\nfile_limit=2000000");
    } else if (mode === "checkauth") {
      const { companyId } = req.params;

      return passport.authenticate("basic", async (err, user) => {
        if (err) {
          return res
            .status(400)
            .send(getResponseMessage("error", undefined, err.message));
        }

        // Find company
        const company = await prisma.company.findUnique({
          where: { id: parseInt(companyId) },
          include: { users: true },
        });

        // Company not found
        if (!company) {
          const invalidCompanyId = req.t("invalidCompanyId");
          return res
            .status(404)
            .send(getResponseMessage("error", undefined, invalidCompanyId));
        }

        // Check that user is a member of a company
        const member = company.users.find((e) => e.userId === user.id);
        if (!member) {
          const userIsNotAMember = req.t("userIsNotAMember");
          return res
            .status(404)
            .send(getResponseMessage("error", undefined, userIsNotAMember));
        }

        const token = jwt.sign(user, JWT_SECRET);
        return res.send(getResponseMessage("success", token));
      })(req, res, next);
    } else if (mode === "import") {
      return res.send(
        getResponseMessage("error", undefined, "Under development")
      );
    } else {
      return res
        .status(400)
        .send(getResponseMessage("error", undefined, `Wrong mode ${mode}`));
    }
  }
);

// @route  POST api/commerce_ml
// @desc   Exchange file upload
// @access Private
router.post("/:companyId", async (req, res, next) => {
  passport.authenticate("jwt", async (err, user, info) => {
    // Check if JWT auth succeeded
    const serverError = req.t("serverError");
    if (err) {
      logger.error(err.message);
      return res
        .status(500)
        .send(getResponseMessage("error", undefined, serverError));
    }

    if (info) {
      return res
        .status(400)
        .send(getResponseMessage("error", undefined, err.message));
    }

    // Retrieve params
    const mode = req.query.mode ?? "import";
    const filename = (req.query.filename as string) ?? "filename";

    const { companyId } = req.params;

    // Find company
    const company = await prisma.company.findUnique({
      where: { id: parseInt(companyId) },
      include: { users: true },
    });

    // Company not found
    if (!company) {
      const invalidCompanyId = req.t("invalidCompanyId");
      return res
        .status(404)
        .send(getResponseMessage("error", undefined, invalidCompanyId));
    }

    // Check that user is a member of a company
    const member = company.users.find((e) => e.userId === user?.id ?? 0);
    if (!member) {
      const userIsNotAMember = req.t("userIsNotAMember");
      return res
        .status(404)
        .send(getResponseMessage("error", undefined, userIsNotAMember));
    }

    // Handle request
    if (mode === "file") {
      // Create folder if needed
      const fullPath = `${process.cwd()}/exchange_files/${companyId}/${filename}`;
      const folderPath = path.dirname(fullPath);
      if (!(await checkFileExists(folderPath))) {
        await fs.promises.mkdir(folderPath, { recursive: true });
      }

      // Write a stream
      const stream = fs.createWriteStream(fullPath);

      let streamError = false;
      stream.on("error", (err) => {
        streamError = true;
        logger.error(err.message);
      });

      req.pipe(stream);

      if (streamError) {
        res
          .status(500)
          .send(getResponseMessage("error", undefined, serverError));
      }
      return res.send(getResponseMessage("success"));
    } else {
      return res
        .status(400)
        .send(getResponseMessage("error", undefined, `Wrong mode ${mode}`));
    }
  })(req, res, next);
});

export { router as commerce_ml };
