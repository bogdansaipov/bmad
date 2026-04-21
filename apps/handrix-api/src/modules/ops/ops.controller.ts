import * as sharedContracts from '@handrix/shared-contracts';
import {
  createErrorResponse,
  createSuccessResponse,
  type InternalOpsSession,
  type OpsQueueResponse,
  type OpsRequestDetailResponse,
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalAuthGuard } from '../auth/internal-auth.guard';
import { InternalRolesGuard } from '../auth/internal-roles.guard';
import { InternalRoles } from '../auth/roles.decorator';
import type { AuthenticatedInternalRequest } from '../auth/internal-auth.types';
import {
  OpsAssignmentError,
  OpsService,
  OpsStatusUpdateError,
} from './ops.service';

@ApiTags('ops')
@Controller('ops')
@UseGuards(InternalAuthGuard, InternalRolesGuard)
export class OpsController {
  constructor(private readonly opsService: OpsService) {}

  @Get('session')
  @InternalRoles('ops')
  @ApiOperation({
    summary:
      'Confirm an authenticated operations session can access protected ops routes.',
  })
  @ApiOkResponse({
    description:
      'A protected operations session payload, wrapped in the shared success envelope.',
  })
  getSession(@Req() request: AuthenticatedInternalRequest) {
    const currentUser = request.user!;
    const payload: InternalOpsSession = {
      scope: 'ops',
      message: 'Operations access granted.',
      user: {
        id: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.displayName,
        role: currentUser.role,
      },
    };

    return createSuccessResponse(payload, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Get('queue')
  @InternalRoles('ops')
  @ApiOperation({
    summary:
      'Return the active operations request queue for authenticated operations staff.',
  })
  @ApiOkResponse({
    description:
      'A protected operations queue payload, wrapped in the shared success envelope.',
  })
  async getQueue() {
    const queue: OpsQueueResponse = await this.opsService.getQueue();

    return createSuccessResponse(queue, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Get('requests/:publicId')
  @InternalRoles('ops')
  @ApiOperation({
    summary:
      'Return the full protected operations request-detail view for a single request.',
  })
  @ApiOkResponse({
    description:
      'A protected operations request-detail payload, wrapped in the shared success envelope.',
  })
  async getRequestDetail(@Param('publicId') publicId: string) {
    const requestDetail: OpsRequestDetailResponse | null =
      await this.opsService.getRequestDetail(publicId);

    if (requestDetail === null) {
      throw new NotFoundException(
        createErrorResponse({
          code: 'OPS_REQUEST_NOT_FOUND',
          message: 'We could not open that operations request right now.',
          recoveryHint:
            'Return to the queue and choose an active request again.',
        }),
      );
    }

    return createSuccessResponse(requestDetail, {
      generatedAt: new Date().toISOString(),
    });
  }

  @Post('requests/:publicId/assignments')
  @InternalRoles('ops')
  @ApiOperation({
    summary:
      'Assign a request to a provider or internal fulfillment owner from the protected operations workspace.',
  })
  @ApiOkResponse({
    description:
      'The updated protected operations request-detail payload after assignment, wrapped in the shared success envelope.',
  })
  async assignRequest(
    @Param('publicId') publicId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedInternalRequest,
  ) {
    const parsedBody = sharedContracts.opsAssignRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'OPS_ASSIGNMENT_VALIDATION_FAILED',
          message: 'We could not assign that fulfillment owner.',
          recoveryHint: 'Choose one of the available owners and try again.',
        }),
      );
    }

    try {
      const requestDetail = await this.opsService.assignRequest(publicId, {
        ...parsedBody.data,
        actorId: request.user!.id,
      });

      return createSuccessResponse(requestDetail, {
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof OpsAssignmentError) {
        const errorPayload = createErrorResponse({
          code: error.code,
          message: error.message,
          recoveryHint: error.recoveryHint,
        });

        if (error.status === 'notFound') {
          throw new NotFoundException(errorPayload);
        }

        throw new BadRequestException(errorPayload);
      }

      throw new InternalServerErrorException(
        createErrorResponse({
          code: 'OPS_ASSIGNMENT_UNAVAILABLE',
          message: 'We could not assign that fulfillment owner right now.',
          recoveryHint:
            'Try again in a moment from the protected request detail view.',
        }),
      );
    }
  }

  @Post('requests/:publicId/status')
  @InternalRoles('ops')
  @ApiOperation({
    summary:
      'Apply a guarded lifecycle status update from the protected operations workspace.',
  })
  @ApiOkResponse({
    description:
      'The updated protected operations request-detail payload after a lifecycle update, wrapped in the shared success envelope.',
  })
  async updateRequestStatus(
    @Param('publicId') publicId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedInternalRequest,
  ) {
    const parsedBody =
      sharedContracts.opsUpdateRequestStatusSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        createErrorResponse({
          code: 'OPS_STATUS_UPDATE_VALIDATION_FAILED',
          message: 'We could not apply that lifecycle update.',
          recoveryHint:
            'Choose one of the available next statuses and try again.',
        }),
      );
    }

    try {
      const requestDetail = await this.opsService.updateRequestStatus(
        publicId,
        {
          ...parsedBody.data,
          actorId: request.user!.id,
        },
      );

      return createSuccessResponse(requestDetail, {
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof OpsStatusUpdateError) {
        const errorPayload = createErrorResponse({
          code: error.code,
          message: error.message,
          recoveryHint: error.recoveryHint,
        });

        if (error.status === 'notFound') {
          throw new NotFoundException(errorPayload);
        }

        throw new BadRequestException(errorPayload);
      }

      throw new InternalServerErrorException(
        createErrorResponse({
          code: 'OPS_STATUS_UPDATE_UNAVAILABLE',
          message: 'We could not apply that lifecycle update right now.',
          recoveryHint:
            'Try again in a moment from the protected request detail view.',
        }),
      );
    }
  }
}
