import { BadRequestException } from '@nestjs/common';

export function assertNotBlank(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BadRequestException(`${field} is required`);
  }

  return normalized;
}

export function assertPositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }

  return value;
}
