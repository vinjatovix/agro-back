import { body, check, checkExact, param } from 'express-validator';

/* eslint-disable 
@typescript-eslint/no-unsafe-member-access
 */

const PASSWORDS_DO_NOT_MATCH_MESSAGE = 'Passwords do not match';

const validateMatchingPassword = (field: string = 'repeatPassword') =>
  check(field, PASSWORDS_DO_NOT_MATCH_MESSAGE).custom(
    (value: string, { req }) => value === req.body.password
  );

const loginSchema = [
  body('email').exists().isEmail(),
  body('password').exists().isString()
];

export const registerReqSchema = [
  body('id').exists().isUUID(),
  body('email').exists().isEmail(),
  body('username').exists().isString(),
  body('password').exists().isStrongPassword(),
  body('repeatPassword').exists().isStrongPassword(),
  validateMatchingPassword(),
  checkExact()
];

export const validateMailReqSchema = [
  param('token').exists().isString(),
  checkExact()
];

export const updatePasswordReqSchema = [
  body('password').exists().isStrongPassword(),
  body('repeatPassword').exists().isStrongPassword(),
  body('oldPassword').exists().isString(),
  validateMatchingPassword(),
  checkExact()
];

export const loginReqSchema = [...loginSchema, checkExact()];

export const googleAuthReqSchema = [
  body('idToken').exists().isString(),
  checkExact()
];
