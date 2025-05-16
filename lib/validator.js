import { body, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const registervalidator = () => [
  body("name", "please enter a name").notEmpty(),
  body("password", "please enter a password").isLength({ min: 8 }),
  body("username", "please enter a username").notEmpty(),
  body("email", "Please enter a valid email").isEmail(),
  body("confirmPassword", "Passwords do not match").custom(
    (value, { req }) => value === req.body.password
  ),
];

const loginvalidator = () => [
  body("password", "please enter a password").isLength({ min: 8 }),
  body("username", "please enter a username").notEmpty(),
];
const validateHandle = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessage = errors
    .array()
    .map((error) => error.msg)
    .join(" ");

  console.log(errorMessage);

  if (!errors.isEmpty()) {
    return next(new ErrorHandler(errorMessage, 400));
  }

  next();
};

const adminLOGINvalidator = () => [
  body("secretKey", "please enter a secretKey").notEmpty(),
];

export {
  adminLOGINvalidator,
  loginvalidator,
  registervalidator,
  validateHandle,
};
