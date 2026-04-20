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
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiCreatedResponse({
    description:
      'The intake evaluation result, wrapped in the shared success envelope.',
  })
  createIntakeEvaluation(@Body() body: unknown) {
    const parsedBody = evaluateIntakeRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException('Unable to evaluate intake details.');
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
  @ApiCreatedResponse({
    description:
      'The request review summary, wrapped in the shared success envelope.',
  })
  createRequestReviewSummary(@Body() body: unknown) {
    const parsedBody = requestReviewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        'Unable to create the request review summary.',
      );
    }

    const summary = this.requestsService.createRequestReviewSummary(
      parsedBody.data,
    );

    if (summary === null) {
      throw new BadRequestException(
        'Unable to create the request review summary for this request.',
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
  @ApiCreatedResponse({
    description:
      'The confirmed request payload, wrapped in the shared success envelope.',
  })
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
  @ApiCreatedResponse({
    description:
      'The current request status payload, wrapped in the shared success envelope.',
  })
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
