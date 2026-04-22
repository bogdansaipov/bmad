import { applyDecorators } from '@nestjs/common';
import { Throttle, minutes, SkipThrottle } from '@nestjs/throttler';

export function PublicWriteThrottle() {
  return applyDecorators(
    Throttle({
      default: {
        limit: 10,
        ttl: minutes(1),
      },
    }),
  );
}

export function PublicPollThrottle() {
  return applyDecorators(
    Throttle({
      default: {
        limit: 30,
        ttl: minutes(1),
      },
    }),
  );
}

export function InternalAuthThrottle() {
  return applyDecorators(
    Throttle({
      default: {
        limit: 5,
        ttl: minutes(1),
      },
    }),
  );
}

export function SkipDefaultThrottle() {
  return applyDecorators(SkipThrottle());
}
