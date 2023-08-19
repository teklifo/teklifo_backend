import passport from "passport";
import passportLocal from "passport-local";
import passportJwt from "passport-jwt";
import bcrypt from "bcrypt";
import randomstring from "randomstring";
import prisma from "./db";
import sendEmail from "./nodemailer/sendEmail";
import { JWT_SECRET, CLIENT_URL } from "../utils/secrets";

const LocalStrategy = passportLocal.Strategy;
const JwtStrategy = passportJwt.Strategy;
const extractJwt = passportJwt.ExtractJwt;

passport.use(
  "local-signup",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const { name } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: email.toLowerCase(), isActive: true },
        });
        if (existingUser && existingUser.isActive) {
          return done(null, false, { message: "email_is_taken" });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate unique activation token
        const activationToken = randomstring.generate();
        const minutes = 30;
        const activationTokenExpires = new Date(
          new Date().getTime() + minutes * 60000
        );

        // Create a new user or update existing one
        const user = await prisma.user.upsert({
          where: {
            email: email.toLowerCase(),
          },
          update: {
            name: name,
            password: hashedPassword,
            activationToken: activationToken,
            activationTokenExpires: activationTokenExpires,
          },
          create: {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            activationToken: activationToken,
            activationTokenExpires: activationTokenExpires,
          },
        });

        // Send verification email
        await sendEmail({
          emailType: "email_verification",
          subject: req.t("subjectEmailVerification"),
          receivers: email,
          context: {
            url: `${CLIENT_URL}/email_verification?activationToken=${activationToken}`,
          },
          locale: req.language,
        });

        return done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  "local-signin",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        // Check if user exists
        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return done(null, false, {
            message: "invalid_credentials",
          });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, {
            message: "invalid_credentials",
          });
        }

        // Check if user is activated
        if (!user.isActive) {
          return done(null, false, {
            message: "email_not_verified",
          });
        }

        return done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  "jwt",
  new JwtStrategy(
    {
      jwtFromRequest: extractJwt.fromAuthHeaderWithScheme("JWT"),
      secretOrKey: JWT_SECRET,
    },
    async (jwtPayload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            id: jwtPayload.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            companies: true,
          },
        });
        if (!user) {
          return done(null, false, { message: "authorization_denied" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
