import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  it('returns the expected fee breakdown', () => {
    const result = service.calculateEstimate('3b5144da-c652-4c14-8a16-aa5bc4bc2f36');

    expect(result.baseFee).toBe(30);
    expect(result.categoryFee).toBe(20);
    expect(result.partsAllowance).toBe(15);
  });

  it('returns an estimated total equal to the fee sum', () => {
    const result = service.calculateEstimate('3b5144da-c652-4c14-8a16-aa5bc4bc2f36');

    expect(result.estimatedTotal).toBe(65);
    expect(result.estimatedTotal).toBe(result.baseFee + result.categoryFee + result.partsAllowance);
  });

  it('returns a non-empty disclaimer', () => {
    const result = service.calculateEstimate('3b5144da-c652-4c14-8a16-aa5bc4bc2f36');

    expect(result.disclaimer).toBeTruthy();
  });

  it('echoes the input category id', () => {
    const categoryId = '3b5144da-c652-4c14-8a16-aa5bc4bc2f36';

    expect(service.calculateEstimate(categoryId).categoryId).toBe(categoryId);
  });
});
