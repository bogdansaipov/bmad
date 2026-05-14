import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HandymanJobFeedResponseDto } from './dto/handyman-job-feed-response.dto';

type CandidateProfileRow = {
  userId: string;
  serviceRadiusKm: number | null;
  baseLat: number | null;
  baseLng: number | null;
};

type HandymanProfileRow = {
  id: string;
  serviceRadiusKm: number | null;
  baseLat: number | null;
  baseLng: number | null;
};

type FeedRow = {
  requestId: string;
  categoryName: string;
  locationLat: number | null;
  locationLng: number | null;
  estimatedTotal: number | null;
  title: string;
  description: string | null;
  createdAt: Date;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function formatDistanceKm(distanceKm: number): number {
  return Math.round(distanceKm * 10) / 10;
}

function deriveRoughAreaLabel(locationLat: number, locationLng: number): string {
  return `Approx. ${locationLat.toFixed(1)}, ${locationLng.toFixed(1)} area`;
}

function mapShortDescription(title: string, description: string | null): string {
  const source = description?.trim() ? description : title;
  return source.length <= 140 ? source : `${source.slice(0, 137)}...`;
}

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async createVisibleOffersForRequest(params: {
    requestId: string;
    categoryId: string;
    locationLat: number | null;
    locationLng: number | null;
  }): Promise<void> {
    if (params.locationLat == null || params.locationLng == null) {
      return;
    }

    const candidateProfiles = await this.prisma.$queryRaw<CandidateProfileRow[]>(Prisma.sql`
      SELECT DISTINCT
        hp.user_id AS "userId",
        hp.service_radius_km AS "serviceRadiusKm",
        hp.base_lat AS "baseLat",
        hp.base_lng AS "baseLng"
      FROM handyman_profiles hp
      INNER JOIN handyman_category_preferences hcp
        ON hcp.handyman_profile_id = hp.id
      WHERE hp.availability_status = 'ONLINE'
        AND hp.service_radius_km IS NOT NULL
        AND hp.base_lat IS NOT NULL
        AND hp.base_lng IS NOT NULL
        AND hcp.category_id = ${params.categoryId}
    `);

    const eligibleRows = candidateProfiles
      .filter((profile) => {
        if (
          profile.serviceRadiusKm == null ||
          profile.baseLat == null ||
          profile.baseLng == null
        ) {
          return false;
        }

        const distanceKm = calculateDistanceKm(
          { lat: profile.baseLat, lng: profile.baseLng },
          { lat: params.locationLat!, lng: params.locationLng! },
        );

        return distanceKm <= profile.serviceRadiusKm;
      })
      .map((profile) =>
        Prisma.sql`(${randomUUID()}, ${params.requestId}, ${profile.userId}, 'PENDING', NOW(), NOW())`,
      );

    if (eligibleRows.length === 0) {
      return;
    }

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO job_offer_visibility (
        id,
        request_id,
        handyman_id,
        offer_status,
        created_at,
        updated_at
      )
      VALUES ${Prisma.join(eligibleRows)}
      ON CONFLICT (request_id, handyman_id) DO NOTHING
    `);
  }

  async findAvailableOffersForHandyman(userId: string): Promise<HandymanJobFeedResponseDto> {
    const profileRows = await this.prisma.$queryRaw<HandymanProfileRow[]>(Prisma.sql`
      SELECT
        hp.id,
        hp.service_radius_km AS "serviceRadiusKm",
        hp.base_lat AS "baseLat",
        hp.base_lng AS "baseLng"
      FROM handyman_profiles hp
      WHERE hp.user_id = ${userId}
      LIMIT 1
    `);
    const profile = profileRows[0];

    if (
      !profile ||
      profile.baseLat == null ||
      profile.baseLng == null ||
      profile.serviceRadiusKm == null
    ) {
      return { items: [] };
    }

    const offers = await this.prisma.$queryRaw<FeedRow[]>(Prisma.sql`
      SELECT
        jov.request_id AS "requestId",
        sc.name AS "categoryName",
        sr.location_lat AS "locationLat",
        sr.location_lng AS "locationLng",
        sr.estimated_total::double precision AS "estimatedTotal",
        sr.title,
        sr.description,
        jov.created_at AS "createdAt"
      FROM job_offer_visibility jov
      INNER JOIN service_requests sr ON sr.id = jov.request_id
      INNER JOIN service_categories sc ON sc.id = sr.category_id
      WHERE jov.handyman_id = ${userId}
        AND jov.offer_status = 'PENDING'
        AND sr.status = 'PENDING'
      ORDER BY jov.created_at DESC
    `);

    return {
      items: offers.map((offer) => {
        const distanceKm =
          offer.locationLat != null && offer.locationLng != null
            ? calculateDistanceKm(
                { lat: profile.baseLat!, lng: profile.baseLng! },
                { lat: offer.locationLat, lng: offer.locationLng },
              )
            : 0;

        return {
          requestId: offer.requestId,
          categoryName: offer.categoryName,
          distanceKm: formatDistanceKm(distanceKm),
          roughAreaLabel:
            offer.locationLat != null && offer.locationLng != null
              ? deriveRoughAreaLabel(offer.locationLat, offer.locationLng)
              : 'Location pending',
          estimatedTotal: offer.estimatedTotal,
          shortDescription: mapShortDescription(offer.title, offer.description),
          createdAt: offer.createdAt.toISOString(),
        };
      }),
    };
  }
}
