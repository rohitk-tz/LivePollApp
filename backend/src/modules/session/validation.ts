// Session validation middleware
// Request validation using express-validator

import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateCreateSession = [
  body('presenterName')
    .trim()
    .notEmpty()
    .withMessage('Presenter name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Presenter name must be between 1 and 255 characters'),
  
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }
    next();
  }
];

export const validateSessionId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Session ID is required')
    .isUUID()
    .withMessage('Session ID must be a valid UUID'),
  
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }
    next();
  }
];

export const validateSessionCode = [
  param('code')
    .trim()
    .notEmpty()
    .withMessage('Session code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Session code must be exactly 6 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Session code must contain only uppercase letters and digits'),
  
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(422).json({
        error: 'Validation failed',
        details: errors.array()
      });
      return;
    }
    next();
  }
];
