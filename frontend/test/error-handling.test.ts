import { describe, it, expect } from 'vitest';
import {
  normalizeHttpError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  SubscriptionSuspendedError,
  PlanLimitReachedError,
} from '@/lib/api/errors';

describe('API Error Normalization', () => {
  it('maps 401 status to UnauthorizedError', () => {
    const error = normalizeHttpError(401, { message: 'Invalid email or password' });
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid email or password');
  });

  it('maps 403 status to ForbiddenError', () => {
    const error = normalizeHttpError(403, { message: 'Forbidden access' });
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.statusCode).toBe(403);
  });

  it('detects SubscriptionSuspendedError on 403 with suspended subscription message', () => {
    const error = normalizeHttpError(403, {
      message: 'Subscription is suspended. Please contact platform support or renew payment.',
    });
    expect(error).toBeInstanceOf(SubscriptionSuspendedError);
    expect(error.code).toBe('SUBSCRIPTION_SUSPENDED');
  });

  it('detects PlanLimitReachedError on 403 with plan limit message', () => {
    const error = normalizeHttpError(403, {
      message: 'Branch limit reached. Your subscription plan allows up to 1 branch.',
    });
    expect(error).toBeInstanceOf(PlanLimitReachedError);
    expect(error.code).toBe('PLAN_LIMIT_REACHED');
  });

  it('maps 409 status to ConflictError', () => {
    const error = normalizeHttpError(409, { message: 'Business slug already taken' });
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.statusCode).toBe(409);
  });

  it('maps 422 and 400 array of messages to ValidationError with fieldErrors', () => {
    const responseBody = {
      message: [
        'email must be an email',
        'password must be longer than or equal to 6 characters',
      ],
      error: 'Bad Request',
      statusCode: 400,
    };

    const error = normalizeHttpError(400, responseBody);
    expect(error).toBeInstanceOf(ValidationError);
    if (error instanceof ValidationError) {
      expect(error.fieldErrors.email).toBe('email must be an email');
      expect(error.fieldErrors.password).toContain('password');
    }
  });

  it('maps object errors to ValidationError fieldErrors', () => {
    const responseBody = {
      message: 'Validation failed',
      errors: {
        phone: 'Invalid Bangladesh phone number',
        slug: 'Slug is already in use',
      },
    };

    const error = normalizeHttpError(422, responseBody);
    expect(error).toBeInstanceOf(ValidationError);
    if (error instanceof ValidationError) {
      expect(error.fieldErrors.phone).toBe('Invalid Bangladesh phone number');
      expect(error.fieldErrors.slug).toBe('Slug is already in use');
    }
  });
});
