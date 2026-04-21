import {
  createErrorResponse,
  createSuccessResponse,
  internalAuthRequestSchema,
} from '@handrix/shared-contracts';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('internal-sessions')
  @ApiOperation({
    summary:
      'Authenticate an internal operations or support user and issue a signed access token.',
  })
  @ApiCreatedResponse({
    description:
      'A signed internal session, wrapped in the shared success envelope.',
  })
  createInternalSession(@Body() body: unknown) {
    const parsedBody = internalAuthRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'INTERNAL_AUTH_VALIDATION_FAILED',
          message: 'We could not start that staff session yet.',
          recoveryHint: 'Check the email and password fields and try again.',
        }),
      );
    }

    const session = this.authService.createInternalSession(parsedBody.data);

    if (!session) {
      throw new UnauthorizedException(
        createErrorResponse({
          code: 'INTERNAL_AUTH_REJECTED',
          message: 'Those staff credentials were not accepted.',
          recoveryHint: 'Use an authorized staff account and try again.',
        }),
      );
    }

    return createSuccessResponse(session, {
      generatedAt: new Date().toISOString(),
    });
  }
}
