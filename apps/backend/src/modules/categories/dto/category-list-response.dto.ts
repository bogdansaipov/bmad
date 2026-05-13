export class ServiceCategoryDto {
  id!: string;
  name!: string;
  description!: string | null;
}

export class CategoryListResponseDto {
  items!: ServiceCategoryDto[];
}
