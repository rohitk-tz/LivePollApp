// Global error handler middleware
// Converts domain errors to appropriate HTTP responses

import { Request, Response, NextFunction } from 'express';
import {
  SessionNotFoundError,
  InvalidSessionStateError,
  SessionCodeGenerationError
} from '../modules/session/types.js';
import {
  InvalidVoteError,
  PollNotActiveError
} from '../modules/vote/types.js';
import {
  PollNotFoundError,
  PollValidationError,
  ActivePollExistsError
} from '../modules/poll/types.js';

interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Session-specific errors
  if (err instanceof SessionNotFoundError) {
    res.status(404).json({
      error: 'Not Found',
      message: err.message
    } as ErrorResponse);
    return;
  }

  if (err instanceof InvalidSessionStateError) {
    res.status(400).json({
      error: 'Invalid State',
      message: err.message
    } as ErrorResponse);
    return;
  }

  if (err instanceof SessionCodeGenerationError) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate unique session code'
    } as ErrorResponse);
    return;
  }

  // Vote-specific errors
  if (err instanceof InvalidVoteError) {
    console.error('[ErrorHandler] InvalidVoteError:', err.message);
    res.status(400).json({
      error: 'Invalid Vote',
      message: err.message
    } as ErrorResponse);
    return;
  }

  if (err instanceof PollNotActiveError) {
    console.error('[ErrorHandler] PollNotActiveError:', err.message);
    res.status(400).json({
      error: 'Poll Not Active',
      message: err.message
    } as ErrorResponse);
    return;
  }

  // Poll-specific errors
  if (err instanceof PollNotFoundError) {
    res.status(404).json({
      error: 'Not Found',
      message: err.message
    } as ErrorResponse);
    return;
  }

  if (err instanceof PollValidationError) {
    res.status(400).json({
      error: 'Validation Error',
      message: err.message
    } as ErrorResponse);
    return;
  }

  if (err instanceof ActivePollExistsError) {
    res.status(409).json({
      error: 'Conflict',
      message: err.message
    } as ErrorResponse);
    return;
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      error: 'Database Error',
      message: 'A database error occurred',
      details: err.message
    } as ErrorResponse);
    return;
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred'
  } as ErrorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  } as ErrorResponse);
}
