import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PresentationContentDto } from '../presentation/presentation.dto';

const serviceItemTypes = ['song', 'scripture', 'media'] as const;

export class AddServiceItemDto {
  @IsIn(serviceItemTypes)
  type!: (typeof serviceItemTypes)[number];

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  itemRef?: string;

  @ValidateNested()
  @Type(() => PresentationContentDto)
  content!: PresentationContentDto;
}

export class ReorderServiceItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemIds!: string[];
}
