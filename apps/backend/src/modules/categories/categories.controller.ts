import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth';
import { CategoriesService } from './categories.service';
import { CategoryListResponseDto } from './dto/category-list-response.dto';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active service categories' })
  findAll(): Promise<CategoryListResponseDto> {
    return this.categoriesService.findAllActive();
  }
}
