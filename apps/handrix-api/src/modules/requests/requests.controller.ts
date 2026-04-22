import {
  createErrorResponse,
  createRequestRequestSchema,
  createSuccessResponse,
  evaluateIntakeRequestSchema,
  requestStatusLookupRequestSchema,
  requestReviewRequestSchema,
} from '@handrix/shared-contracts';
import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  PublicPollThrottle,
  PublicWriteThrottle,
} from '../../common/security/throttle-policies';
import { requestsOpenApiExamples } from '../../common/swagger/shared-contract-openapi';
import { RequestsService } from './requests.service';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post('intake-evaluations')
  @ApiOperation({
    summary:
      'Evaluate the selected issue details and service location for scope and serviceability.',
  })
  @ApiBody({
    schema: {
      example: requestsOpenApiExamples.intakeEvaluation.requestBody,
    },
  })
  @ApiCreatedResponse({
    description:
      'The intake evaluation result, wrapped in the shared success envelope.',
    schema: {
      example: requestsOpenApiExamples.intakeEvaluation.successResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The intake evaluation request body did not match the shared contract.',
    schema: {
      example: requestsOpenApiExamples.intakeEvaluation.validationError,
    },
  })
  @PublicWriteThrottle()
  createIntakeEvaluation(@Body() body: unknown) {
    const parsedBody = evaluateIntakeRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REQUEST_INTAKE_EVALUATION_VALIDATION_FAILED',
          message: 'Unable to evaluate intake details.',
          recoveryHint:
            'Review the issue answers and address details, then try again.',
        }),
      );
    }

    const evaluation = this.requestsService.evaluateIntake(
      parsedBody.data.issueTypeId,
      parsedBody.data.answers,
      parsedBody.data.serviceLocation,
    );

    return createSuccessResponse(evaluation, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Post('review-summaries')
  @ApiOperation({
    summary:
      'Assemble a pre-confirmation review summary with request details, ETA guidance, pricing expectations, and next-step messaging.',
  })
  @ApiBody({
    schema: {
      example: requestsOpenApiExamples.reviewSummary.requestBody,
    },
  })
  @ApiCreatedResponse({
    description:
      'The request review summary, wrapped in the shared success envelope.',
    schema: {
      example: requestsOpenApiExamples.reviewSummary.successResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The review-summary request could not be parsed or did not represent a confirmable request.',
    schema: {
      example: requestsOpenApiExamples.reviewSummary.validationError,
    },
  })
  @PublicWriteThrottle()
  createRequestReviewSummary(@Body() body: unknown) {
    const parsedBody = requestReviewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REQUEST_REVIEW_SUMMARY_VALIDATION_FAILED',
          message: 'Unable to create the request review summary.',
          recoveryHint: 'Review the request details and try again.',
        }),
      );
    }

    const summary = this.requestsService.createRequestReviewSummary(
      parsedBody.data,
    );

    if (summary === null) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REQUEST_REVIEW_SUMMARY_REJECTED',
          message:
            'Unable to create the request review summary for this request.',
          recoveryHint:
            'Return to the intake flow and refresh the request details.',
        }),
      );
    }

    return createSuccessResponse(summary, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Post()
  @ApiOperation({
    summary:
      'Create an anonymous customer request from reviewed intake details and return a customer-safe tracking identity.',
  })
  @ApiBody({
    schema: {
      example: requestsOpenApiExamples.createRequest.requestBody,
    },
  })
  @ApiCreatedResponse({
    description:
      'The confirmed request payload, wrapped in the shared success envelope.',
    schema: {
      example: requestsOpenApiExamples.createRequest.successResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The confirmation request was invalid or could not be accepted from the current request state.',
    schema: {
      example: requestsOpenApiExamples.createRequest.validationError,
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'The request could not be confirmed right now.',
    schema: {
      example: requestsOpenApiExamples.createRequest.unavailableError,
    },
  })
  @PublicWriteThrottle()
  async createRequest(@Body() body: unknown) {
    const parsedBody = createRequestRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REQUEST_VALIDATION_FAILED',
          message: 'We could not confirm this request yet.',
          recoveryHint: 'Please review the request details and try again.',
        }),
      );
    }

    try {
      const request = await this.requestsService.createAnonymousRequest(
        parsedBody.data,
      );

      return createSuccessResponse(request, {
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not confirm the request right now.';
      const isRecoverableValidationProblem =
        message === 'This request is not ready for confirmation yet.' ||
        message ===
          'We could not match this issue type for request creation.' ||
        message ===
          'This confirmation attempt conflicts with an existing request submission.';

      if (isRecoverableValidationProblem) {
        throw new BadRequestException(
          createErrorResponse({
            code: 'REQUEST_CONFIRMATION_REJECTED',
            message: 'We could not confirm this request yet.',
            recoveryHint:
              'Please review the latest request details before trying again.',
          }),
        );
      }

      throw new InternalServerErrorException(
        createErrorResponse({
          code: 'REQUEST_CONFIRMATION_UNAVAILABLE',
          message: 'We could not confirm the request right now.',
          recoveryHint:
            'Please try again in a moment using the same reviewed details.',
        }),
      );
    }
  }

  @Post('status-lookups')
  @ApiOperation({
    summary:
      'Resolve the current customer-safe request status for an anonymous tracking identity.',
  })
  @ApiBody({
    schema: {
      example: requestsOpenApiExamples.requestStatusLookup.requestBody,
    },
  })
  @ApiCreatedResponse({
    description:
      'The current request status payload, wrapped in the shared success envelope.',
    schema: {
      example: requestsOpenApiExamples.requestStatusLookup.successResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The status-lookup request was invalid or could not be resolved for the supplied tracking identity.',
    schema: {
      example: requestsOpenApiExamples.requestStatusLookup.validationError,
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'The request status could not be opened right now.',
    schema: {
      example: requestsOpenApiExamples.requestStatusLookup.unavailableError,
    },
  })
  @PublicPollThrottle()
  async createRequestStatusLookup(@Body() body: unknown) {
    const parsedBody = requestStatusLookupRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REQUEST_STATUS_LOOKUP_VALIDATION_FAILED',
          message: 'We could not open that request status yet.',
          recoveryHint:
            'Please return using the latest request confirmation details and try again.',
        }),
      );
    }

    try {
      const requestStatus = await this.requestsService.getRequestStatus(
        parsedBody.data,
      );

      return createSuccessResponse(requestStatus, {
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not open that request status right now.';
      const isRecoverableLookupProblem =
        message === 'This request status is not available right now.';

      if (isRecoverableLookupProblem) {
        throw new BadRequestException(
          createErrorResponse({
            code: 'REQUEST_STATUS_LOOKUP_REJECTED',
            message: 'We could not open that request status right now.',
            recoveryHint:
              'Please return using the latest request confirmation details or start a new request if needed.',
          }),
        );
      }

      throw new InternalServerErrorException(
        createErrorResponse({
          code: 'REQUEST_STATUS_LOOKUP_UNAVAILABLE',
          message: 'We could not open that request status right now.',
          recoveryHint:
            'Please try again in a moment using the same confirmation details.',
        }),
      );
    }
  }
}
