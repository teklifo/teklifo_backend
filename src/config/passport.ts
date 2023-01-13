import passport from 'passport';
import passportLocal from 'passport-local';
import bcrypt from 'bcrypt';
import randomstring from 'randomstring';
import { User } from '../entities/User';

const LocalStrategy = passportLocal.Strategy;

passport.use(
  'local-signup',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
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
          return done(null, false, { message: 'email_is_taken' });
        }

        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate unique activation token
        const activationToken = randomstring.generate({
          length: 5,
          charset: 'numeric',
        });
        const minutes = 30;
        const activationTokenExpires = new Date(
          new Date().getTime() + minutes * 60000,
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

        return done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
        });
      } catch (error) {
        return done(error);
      }
    },
  ),
);
