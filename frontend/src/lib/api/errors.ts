/**
 * Normalized API Error Classes
 */

export interface FieldErrorMap {
  [fieldName: string]: string;
}

export class ApiError extends Error {
  statusCode: number;
  data: any;
  code?: string;

  constructor(message: string, statusCode: number, data?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    this.code = code;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Session expired or invalid credentials') {
    super(message, 401, null, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, null, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict or duplicate entry') {
    super(message, 409, null, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ValidationError extends ApiError {
  fieldErrors: FieldErrorMap;

  constructor(message: string, fieldErrors: FieldErrorMap = {}, rawData?: any) {
    super(message, 422, rawData, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class SubscriptionSuspendedError extends ApiError {
  constructor(message = 'Your subscription is suspended. Please contact platform billing or renew.') {
    super(message, 403, null, 'SUBSCRIPTION_SUSPENDED');
    this.name = 'SubscriptionSuspendedError';
  }
}

export class PlanLimitReachedError extends ApiError {
  constructor(message = 'Plan limit reached. Please upgrade your subscription.') {
    super(message, 403, null, 'PLAN_LIMIT_REACHED');
    this.name = 'PlanLimitReachedError';
  }
}

export class InsufficientStockError extends ApiError {
  availableQuantity?: number;

  constructor(message = 'Insufficient stock for this operation', availableQuantity?: number, rawData?: any) {
    super(message, 400, rawData, 'INSUFFICIENT_STOCK');
    this.name = 'InsufficientStockError';
    this.availableQuantity = availableQuantity;
  }
}

export function extractAvailableStockFromError(message: string): number | undefined {
  const match = message.match(/available:?\s*([0-9.]+)/i);
  return match && match[1] ? parseFloat(match[1]) : undefined;
}

/**
 * Normalizes HTTP response errors into strongly-typed error instances
 */
export function normalizeHttpError(statusCode: number, responseData: any): ApiError {
  const rawMessage =
    responseData?.message ||
    responseData?.error ||
    `HTTP error with status code ${statusCode}`;

  const messageText = Array.isArray(rawMessage) ? rawMessage.join(', ') : String(rawMessage);

  // Check for subscription suspended (backend returns 403 with suspended message)
  if (
    statusCode === 403 &&
    (messageText.toLowerCase().includes('subscription is suspended') ||
      messageText.toLowerCase().includes('subscription suspended'))
  ) {
    return new SubscriptionSuspendedError(messageText);
  }

  // Check for plan limit reached (backend returns 403 with limit reached message)
  if (
    statusCode === 403 &&
    (messageText.toLowerCase().includes('limit reached') ||
      messageText.toLowerCase().includes('plan limit'))
  ) {
    return new PlanLimitReachedError(messageText);
  }

  if (statusCode === 401) {
    return new UnauthorizedError(messageText);
  }

  if (statusCode === 403) {
    return new ForbiddenError(messageText);
  }

  if (statusCode === 409) {
    return new ConflictError(messageText);
  }

  // Check for Insufficient Stock error (400 or 422 with message containing "sold or moved", "available:", "insufficient stock")
  if (
    (statusCode === 400 || statusCode === 422) &&
    (messageText.toLowerCase().includes('already been sold or moved') ||
      messageText.toLowerCase().includes('insufficient stock') ||
      messageText.toLowerCase().includes('current available:') ||
      responseData?.code === 'INSUFFICIENT_STOCK')
  ) {
    let availQty: number | undefined;
    const match = messageText.match(/available:?\s*([0-9.]+)/i);
    if (match && match[1]) {
      availQty = parseFloat(match[1]);
    }
    return new InsufficientStockError(messageText, availQty, responseData);
  }

  // NestJS class-validator returns 400 with message: string[] (e.g. ['email must be an email', ...])
  // Standard 422 Unprocessable Entity
  if (statusCode === 400 || statusCode === 422) {
    const fieldErrors: FieldErrorMap = {};

    if (Array.isArray(responseData?.message)) {
      for (const msg of responseData.message) {
        // Example format: "email must be an email", "phone should not be empty"
        const words = msg.split(' ');
        const potentialField = words[0];
        if (potentialField) {
          fieldErrors[potentialField] = msg;
        }
      }
    } else if (responseData?.errors && typeof responseData.errors === 'object') {
      for (const [k, v] of Object.entries(responseData.errors)) {
        fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
      }
    }

    return new ValidationError(messageText, fieldErrors, responseData);
  }

  return new ApiError(messageText, statusCode, responseData);
}
