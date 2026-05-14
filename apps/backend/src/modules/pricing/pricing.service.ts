import { Injectable } from '@nestjs/common';

export interface PricingEstimateResult {
  categoryId: string;
  baseFee: number;
  categoryFee: number;
  partsAllowance: number;
  estimatedTotal: number;
  disclaimer: string;
}

@Injectable()
export class PricingService {
  private static readonly BASE_FEE = 30;
  private static readonly CATEGORY_FEE = 20;
  private static readonly PARTS_ALLOWANCE = 15;
  private static readonly DISCLAIMER =
    'This is an estimate. Final charges may vary based on actual work and materials.';

  calculateEstimate(categoryId: string): PricingEstimateResult {
    const baseFee = PricingService.BASE_FEE;
    const categoryFee = PricingService.CATEGORY_FEE;
    const partsAllowance = PricingService.PARTS_ALLOWANCE;

    return {
      categoryId,
      baseFee,
      categoryFee,
      partsAllowance,
      estimatedTotal: baseFee + categoryFee + partsAllowance,
      disclaimer: PricingService.DISCLAIMER,
    };
  }
}
