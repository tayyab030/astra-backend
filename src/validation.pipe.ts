import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

function formatValidationErrors(errors: ValidationError[]) {
  const formatted: Record<string, string[]> = {};

  for (const error of errors) {
    if (error.constraints) {
      formatted[error.property] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      const childErrors = formatValidationErrors(error.children);
      for (const [key, value] of Object.entries(childErrors)) {
        formatted[`${error.property}.${key}`] = value;
      }
    }
  }

  return formatted;
}

export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException(formatValidationErrors(errors)),
  });
}
