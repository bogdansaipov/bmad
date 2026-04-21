import {
  createErrorResponse,
  createSuccessResponse,
  supportSearchRequestQuerySchema,
  type SupportRequestDetailResponse,
  type SupportRequestSearchResponse,
} from '@handrix/shared-contracts';
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InternalAuthGuard } from '../auth/internal-auth.guard';
import { InternalRolesGuard } from '../auth/internal-roles.guard';
import { InternalRoles } from '../auth/roles.decorator';
import type { AuthenticatedInternalRequest } from '../auth/internal-auth.types';
import { SupportService } from './support.service';

@ApiTags('support')
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
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({
    description:
      'A protected support search payload, wrapped in the shared success envelope.',
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
  @ApiParam({ name: 'publicId', type: String })
  @ApiOkResponse({
    description:
      'A protected support request-detail payload, wrapped in the shared success envelope.',
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
}
