export class HandymanCategoryPreferenceDto {
  categoryId!: string;
  categoryName!: string;
}

export class HandymanProfileSetupResponseDto {
  displayName!: string;
  availabilityStatus!: string;
  serviceRadiusKm!: number | null;
  categories!: HandymanCategoryPreferenceDto[];
  isProfileComplete!: boolean;
}
