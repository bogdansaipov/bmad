import {
  containmentGuidanceRequestSchema,
  createErrorResponse,
  createSuccessResponse,
  issueTypeIdSchema,
} from '@handrix/shared-contracts';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { referenceDataOpenApiExamples } from '../../common/swagger/shared-contract-openapi';
import { ReferenceDataService } from './reference-data.service';

@ApiTags('reference-data')
@Controller('reference-data')
export class ReferenceDataController {
  constructor(private readonly referenceDataService: ReferenceDataService) {}

  @Get('issue-types')
  @ApiOperation({
    summary:
      'Return the supported plumbing issue types shown in the public intake flow.',
  })
  @ApiOkResponse({
    description:
      'The supported issue types for the MVP intake flow, wrapped in the shared success envelope.',
    schema: {
      example: referenceDataOpenApiExamples.issueTypesResponse,
    },
  })
  getIssueTypes() {
    return createSuccessResponse(this.referenceDataService.getIssueTypes(), {
      generatedAt: new Date().toISOString(),
    });
  }

  @Get('intake-question-sets/:issueTypeId')
  @ApiOperation({
    summary:
      'Return the clarifying-question definition for the selected supported issue type.',
  })
  @ApiParam({
    name: 'issueTypeId',
    type: String,
    example: 'slow-drain',
  })
  @ApiOkResponse({
    description:
      'The question set for a supported issue type, wrapped in the shared success envelope.',
    schema: {
      example: referenceDataOpenApiExamples.intakeQuestionSetResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The issue type was unsupported or the request could not be resolved through the shared contract.',
    schema: {
      example: referenceDataOpenApiExamples.issueTypeError,
    },
  })
  getIntakeQuestionSet(@Param('issueTypeId') issueTypeIdParam: string) {
    const parsedIssueType = issueTypeIdSchema.safeParse(issueTypeIdParam);

    if (!parsedIssueType.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REFERENCE_DATA_ISSUE_TYPE_INVALID',
          message: 'That issue type is not supported right now.',
          recoveryHint:
            'Choose one of the supported plumbing issues and try again.',
        }),
      );
    }

    const questionSet = this.referenceDataService.getIntakeQuestionSet(
      parsedIssueType.data,
    );

    if (questionSet === null) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REFERENCE_DATA_REQUEST_INVALID',
          message: 'We could not resolve that reference-data request.',
          recoveryHint:
            'Check the request details and retry with a supported issue type or classification.',
        }),
      );
    }

    return createSuccessResponse(questionSet, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Get('containment-guidance/:issueTypeId')
  @ApiOperation({
    summary:
      'Return issue-specific containment guidance for the intake classification context.',
  })
  @ApiQuery({
    name: 'serviceabilityStatus',
    required: true,
    example:
      referenceDataOpenApiExamples.containmentGuidanceQuery
        .serviceabilityStatus,
  })
  @ApiQuery({
    name: 'nextStep',
    required: true,
    example: referenceDataOpenApiExamples.containmentGuidanceQuery.nextStep,
  })
  @ApiQuery({
    name: 'recoveryCode',
    required: false,
    example: 'OUT_OF_SERVICE_AREA',
  })
  @ApiOkResponse({
    description:
      'The containment guidance for the selected issue and classification context, wrapped in the shared success envelope.',
    schema: {
      example: referenceDataOpenApiExamples.containmentGuidanceResponse,
    },
  })
  @ApiBadRequestResponse({
    description:
      'The issue type or classification query did not match the shared reference-data contracts.',
    schema: {
      example: referenceDataOpenApiExamples.requestError,
    },
  })
  getContainmentGuidance(
    @Param('issueTypeId') issueTypeIdParam: string,
    @Query() query: unknown,
  ) {
    const parsedIssueType = issueTypeIdSchema.safeParse(issueTypeIdParam);

    if (!parsedIssueType.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REFERENCE_DATA_ISSUE_TYPE_INVALID',
          message: 'That issue type is not supported right now.',
          recoveryHint:
            'Choose one of the supported plumbing issues and try again.',
        }),
      );
    }

    const parsedRequest = containmentGuidanceRequestSchema.safeParse(query);

    if (!parsedRequest.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REFERENCE_DATA_REQUEST_INVALID',
          message: 'We could not resolve that reference-data request.',
          recoveryHint:
            'Check the request details and retry with a supported issue type or classification.',
        }),
      );
    }

    const guidance = this.referenceDataService.getContainmentGuidance(
      parsedIssueType.data,
      parsedRequest.data,
    );

    if (guidance === null) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'REFERENCE_DATA_REQUEST_INVALID',
          message: 'We could not resolve that reference-data request.',
          recoveryHint:
            'Check the request details and retry with a supported issue type or classification.',
        }),
      );
    }

    return createSuccessResponse(guidance, {
      generatedAt: new Date().toISOString(),
    });
  }
}
