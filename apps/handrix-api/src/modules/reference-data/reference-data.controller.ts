import {
  containmentGuidanceRequestSchema,
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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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
      example: {
        data: [
          {
            id: 'dripping-faucet',
            label: 'Dripping faucet',
            shortDescription:
              'Water keeps dripping from a sink or fixture that should be off.',
            urgencyCue: 'Usually manageable',
          },
        ],
        meta: {
          generatedAt: '2026-04-14T12:00:00.000Z',
        },
      },
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
  @ApiOkResponse({
    description:
      'The question set for a supported issue type, wrapped in the shared success envelope.',
  })
  getIntakeQuestionSet(@Param('issueTypeId') issueTypeIdParam: string) {
    const parsedIssueType = issueTypeIdSchema.safeParse(issueTypeIdParam);

    if (!parsedIssueType.success) {
      throw new BadRequestException('Unsupported issue type identifier.');
    }

    const questionSet = this.referenceDataService.getIntakeQuestionSet(
      parsedIssueType.data,
    );

    if (questionSet === null) {
      throw new BadRequestException(
        'Unable to resolve intake questions for this issue type.',
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
  })
  @ApiQuery({
    name: 'nextStep',
    required: true,
  })
  @ApiQuery({
    name: 'recoveryCode',
    required: false,
  })
  @ApiOkResponse({
    description:
      'The containment guidance for the selected issue and classification context, wrapped in the shared success envelope.',
  })
  getContainmentGuidance(
    @Param('issueTypeId') issueTypeIdParam: string,
    @Query() query: unknown,
  ) {
    const parsedIssueType = issueTypeIdSchema.safeParse(issueTypeIdParam);

    if (!parsedIssueType.success) {
      throw new BadRequestException('Unsupported issue type identifier.');
    }

    const parsedRequest = containmentGuidanceRequestSchema.safeParse(query);

    if (!parsedRequest.success) {
      throw new BadRequestException(
        'Unable to resolve containment guidance for this request.',
      );
    }

    const guidance = this.referenceDataService.getContainmentGuidance(
      parsedIssueType.data,
      parsedRequest.data,
    );

    if (guidance === null) {
      throw new BadRequestException(
        'Unable to resolve containment guidance for this issue type.',
      );
    }

    return createSuccessResponse(guidance, {
      generatedAt: new Date().toISOString(),
    });
  }
}
