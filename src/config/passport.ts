import passport from "passport";
import passportLocal from "passport-local";
import passportJwt from "passport-jwt";
import bcrypt from "bcrypt";
import randomstring from "randomstring";
import emailSender from "./nodemailer/emailSender";
import { User } from "../entities/User";
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
        let user = await User.findOneBy({
          email: email.toLowerCase(),
        });
        if (user && user.is_active) {
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

        if (user) {
          user.name = name;
          user.password = hashedPassword;
          user.activation_token = activationToken;
          user.activation_token_expires = activationTokenExpires;
        } else {
          user = User.create({
            name: req.body.name,
            email: email.toLowerCase(),
            password: hashedPassword,
            activation_token: activationToken,
            activation_token_expires: activationTokenExpires,
          });
        }

        // Save user
        await user.save();

        // Send verification email
        await emailSender({
          emailType: "email_verification",
          subject: req.t("subjectEmailVerification"),
          receivers: email,
          context: {
            url: `${CLIENT_URL}/verification?activationToken=${activationToken}`,
          },
        });

        return done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
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
        const user = await User.findOneBy({
          email: email.toLowerCase(),
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
        if (!user.is_active) {
          return done(null, false, {
            message: "email_not_verified",
          });
        }

        return done(null, user);
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
        const user = await User.findOne({
          where: { id: jwtPayload.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            created_at: true,
            updated_at: true,
            companies: true,
          },
          relations: ["companies"],
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
