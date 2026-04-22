import type { ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { createErrorResponse } from '@handrix/shared-contracts';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as {
      ips?: string[];
      ip?: string;
      socket?: { remoteAddress?: string };
    };

    if (Array.isArray(request.ips) && request.ips.length > 0) {
      return Promise.resolve(request.ips[0]);
    }

    if (typeof request.ip === 'string' && request.ip.length > 0) {
      return Promise.resolve(request.ip);
    }

    return Promise.resolve(request.socket?.remoteAddress ?? 'unknown');
  }

  protected override throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    void context;
    void throttlerLimitDetail;

    return Promise.reject(
      new HttpException(
        createErrorResponse({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'We are receiving too many requests from this connection.',
          recoveryHint: 'Please wait a moment and try again.',
        }),
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  }
}
