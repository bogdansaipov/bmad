import {
  createErrorResponse,
  createSuccessResponse,
  supportInterventionRequestSchema,
  supportSearchRequestQuerySchema,
  type SupportRequestDetailResponse,
  type SupportRequestSearchResponse,
} from '@handrix/shared-contracts';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  authOpenApiExamples,
  supportOpenApiExamples,
} from '../../common/swagger/shared-contract-openapi';
import { InternalAuthGuard } from '../auth/internal-auth.guard';
import { InternalRolesGuard } from '../auth/internal-roles.guard';
import { InternalRoles } from '../auth/roles.decorator';
import type { AuthenticatedInternalRequest } from '../auth/internal-auth.types';
import { SupportInterventionError, SupportService } from './support.service';

@ApiTags('support')
@ApiUnauthorizedResponse({
  description: 'A valid protected staff session is required.',
  schema: {
    example: authOpenApiExamples.protectedErrors.unauthorized,
  },
})
@ApiForbiddenResponse({
  description:
    'The current staff role cannot access this protected support route.',
  schema: {
    example: authOpenApiExamples.protectedErrors.forbidden,
  },
})
@Controller('support')
@UseGuards(InternalAuthGuard, InternalRolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('session')
  @InternalRoles('support')
  @ApiOperation({
    summary:
      'Confirm an authenticated support session can access protected support routes.',
  })
  @ApiOkResponse({
    description:
      'A protected support session payload, wrapped in the shared success envelope.',
    schema: {
      example: supportOpenApiExamples.sessionResponse,
    },
  })
  getSession(@Req() request: AuthenticatedInternalRequest) {
    const payload = this.supportService.buildSessionPayload(request.user!);

    return createSuccessResponse(payload, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Get('requests')
  @InternalRoles('support')
  @ApiOperation({
    summary: 'Search customer requests visible to authenticated support staff.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    example: supportOpenApiExamples.searchQuery.q,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: supportOpenApiExamples.searchQuery.limit,
  })
  @ApiOkResponse({
    description:
      'A protected support search payload, wrapped in the shared success envelope.',
    schema: {
      example: supportOpenApiExamples.searchResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The protected support search query did not match the shared contract.',
    schema: {
      example: supportOpenApiExamples.searchValidationError,
    },
  })
  async getRequests(@Query() rawQuery: Record<string, unknown>) {
    const parsed = supportSearchRequestQuerySchema.safeParse(rawQuery);

    if (!parsed.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'SUPPORT_SEARCH_QUERY_INVALID',
          message: 'We could not run that search.',
          recoveryHint:
            'Try a shorter search term or remove special characters.',
        }),
      );
    }

    const result: SupportRequestSearchResponse =
      await this.supportService.searchRequests(parsed.data);

    return createSuccessResponse(result, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Get('requests/:publicId')
  @InternalRoles('support')
  @ApiOperation({
    summary:
      'Return the minimal protected support request-detail payload for a single request.',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    example: supportOpenApiExamples.pathParams.publicId,
  })
  @ApiOkResponse({
    description:
      'A protected support request-detail payload, wrapped in the shared success envelope.',
    schema: {
      example: supportOpenApiExamples.requestDetailResponse,
    },
  })
  async getRequestDetail(@Param('publicId') publicId: string) {
    const detail: SupportRequestDetailResponse | null =
      await this.supportService.getRequestDetail(publicId);

    if (detail === null) {
      throw new NotFoundException(
        createErrorResponse({
          code: 'SUPPORT_REQUEST_NOT_FOUND',
          message: 'We could not open that request right now.',
          recoveryHint: 'Return to search and choose a request again.',
        }),
      );
    }

    return createSuccessResponse(detail, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Post('requests/:publicId/interventions')
  @InternalRoles('support')
  @ApiOperation({
    summary:
      'Record a protected support follow-up or intervention on a single request.',
  })
  @ApiParam({
    name: 'publicId',
    type: String,
    example: supportOpenApiExamples.pathParams.publicId,
  })
  @ApiBody({
    schema: {
      example: supportOpenApiExamples.interventionRequestBody,
    },
  })
  @ApiOkResponse({
    description:
      'The refreshed support request-detail payload after a follow-up was recorded, wrapped in the shared success envelope.',
    schema: {
      example: supportOpenApiExamples.requestDetailResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The support intervention request did not match the shared contract or current request state.',
    schema: {
      example: supportOpenApiExamples.validationError,
    },
  })
  async recordIntervention(
    @Param('publicId') publicId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedInternalRequest,
  ) {
    const parsedBody = supportInterventionRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'SUPPORT_INTERVENTION_VALIDATION_FAILED',
          message: 'We could not record that support follow-up.',
          recoveryHint:
            'Choose a follow-up type, add a short note, and try again.',
        }),
      );
    }

    try {
      const detail = await this.supportService.recordIntervention(publicId, {
        ...parsedBody.data,
        actorId: request.user!.id,
      });

      return createSuccessResponse(detail, {
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof SupportInterventionError) {
        const payload = createErrorResponse({
          code: error.code,
          message: error.message,
          recoveryHint: error.recoveryHint,
        });

        if (error.status === 'notFound') {
          throw new NotFoundException(payload);
        }

        throw new BadRequestException(payload);
      }

      throw new InternalServerErrorException(
        createErrorResponse({
          code: 'SUPPORT_INTERVENTION_UNAVAILABLE',
          message: 'We could not record that support follow-up right now.',
          recoveryHint:
            'Try again in a moment from the protected support request view.',
        }),
      );
    }
  }
}
