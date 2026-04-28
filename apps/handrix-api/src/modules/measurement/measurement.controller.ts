import {
  createErrorResponse,
  createSuccessResponse,
} from '@handrix/shared-contracts';
import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalAuthGuard } from '../auth/internal-auth.guard';
import { InternalRolesGuard } from '../auth/internal-roles.guard';
import { InternalRoles } from '../auth/roles.decorator';
import {
  DEFAULT_PROMISED_RESPONSE_MINUTES,
  MeasurementService,
} from './measurement.service';

const DEFAULT_SINCE_DAYS = 30;
// Matches ISO-8601 timestamps with a mandatory timezone offset — e.g.
// 2026-04-01T00:00:00Z or 2026-04-01T00:00:00+02:00. Naive timestamps are
// rejected so callers cannot implicitly depend on the server's local TZ.
const ISO_TIMESTAMP_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function throwSinceInvalid(): never {
  throw new BadRequestException(
    createErrorResponse({
      code: 'MEASUREMENT_SINCE_INVALID',
      message: 'The measurement window start date is not valid.',
      recoveryHint:
        'Pass an ISO-8601 timestamp with timezone offset via ?since=2026-04-01T00:00:00Z.',
    }),
  );
}

function parseSinceQueryParam(value: unknown): Date {
  if (typeof value === 'undefined' || value === null || value === '') {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() - DEFAULT_SINCE_DAYS);
    fallback.setUTCHours(0, 0, 0, 0);
    return fallback;
  }

  if (typeof value !== 'string') {
    throwSinceInvalid();
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || !ISO_TIMESTAMP_WITH_OFFSET.test(trimmed)) {
    throwSinceInvalid();
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    throwSinceInvalid();
  }

  return parsed;
}

function parsePromisedMinutesQueryParam(value: unknown): number {
  if (typeof value === 'undefined' || value === null || value === '') {
    return DEFAULT_PROMISED_RESPONSE_MINUTES;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new BadRequestException(
      createErrorResponse({
        code: 'MEASUREMENT_PROMISED_MINUTES_INVALID',
        message: 'The promised response window must be a positive integer.',
        recoveryHint:
          'Omit the parameter to use the default window or pass a positive integer like ?promisedResponseMinutes=60.',
      }),
    );
  }

  return parsed;
}

@ApiTags('internal-measurement')
@Controller('internal/measurement')
@UseGuards(InternalAuthGuard, InternalRolesGuard)
export class MeasurementController {
  constructor(private readonly measurementService: MeasurementService) {}

  @Get('summary')
  @InternalRoles('ops')
  @ApiOperation({
    summary:
      'Aggregate MVP success measurement metrics across the observed time window.',
  })
  async getSummary(@Query() query: Record<string, unknown>) {
    const since = parseSinceQueryParam(query.since);
    const promisedMinutes = parsePromisedMinutesQueryParam(
      query.promisedResponseMinutes,
    );

    const summary = await this.measurementService.getSummary(
      since,
      promisedMinutes,
    );

    return createSuccessResponse(summary, {
      generatedAt: new Date().toISOString(),
    });
  }
}
