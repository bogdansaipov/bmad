import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HandymanProfileSetupResponseDto } from './dto/handyman-profile-response.dto';
import { UpdateHandymanProfileDto } from './dto/update-handyman-profile.dto';

const profileInclude = {
  categoryPreferences: {
    include: { category: { select: { id: true, name: true } } },
    orderBy: { category: { name: 'asc' } },
  },
} as const satisfies Prisma.HandymanProfileInclude;

type ProfileWithCategories = Prisma.HandymanProfileGetPayload<{
  include: typeof profileInclude;
}>;

function toResponse(profile: ProfileWithCategories): HandymanProfileSetupResponseDto {
  const categories = profile.categoryPreferences.map((pref) => ({
    categoryId: pref.category.id,
    categoryName: pref.category.name,
  }));

  const dto = new HandymanProfileSetupResponseDto();
  dto.displayName = profile.displayName;
  dto.availabilityStatus = profile.availabilityStatus;
  dto.serviceRadiusKm = profile.serviceRadiusKm;
  dto.categories = categories;
  dto.isProfileComplete = profile.serviceRadiusKm != null && categories.length > 0;
  return dto;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getHandymanProfile(userId: string): Promise<HandymanProfileSetupResponseDto> {
    const profile = await this.prisma.handymanProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });

    if (!profile) {
      throw new NotFoundException('Handyman profile not found');
    }

    return toResponse(profile);
  }

  async updateHandymanProfile(
    userId: string,
    dto: UpdateHandymanProfileDto,
  ): Promise<HandymanProfileSetupResponseDto> {
    const profile = await this.prisma.handymanProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Handyman profile not found');
    }

    const uniqueCategoryIds = Array.from(new Set(dto.categoryIds));

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const categories = await tx.serviceCategory.findMany({
          where: { id: { in: uniqueCategoryIds } },
          select: { id: true, isActive: true },
        });

        if (categories.length !== uniqueCategoryIds.length) {
          throw new BadRequestException('One or more selected categories do not exist');
        }
        if (categories.some((c) => !c.isActive)) {
          throw new BadRequestException('One or more selected categories are not active');
        }

        await tx.handymanCategoryPreference.deleteMany({
          where: { handymanProfileId: profile.id },
        });

        await tx.handymanCategoryPreference.createMany({
          data: uniqueCategoryIds.map((categoryId) => ({
            handymanProfileId: profile.id,
            categoryId,
          })),
        });

        return tx.handymanProfile.update({
          where: { id: profile.id },
          data: { serviceRadiusKm: dto.serviceRadiusKm },
          include: profileInclude,
        });
      });

      return toResponse(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Profile is being updated from another session. Please retry.');
      }
      throw err;
    }
  }
}
