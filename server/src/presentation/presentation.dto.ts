import { IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const contentTypes = ['song', 'scripture', 'media', 'blank'] as const;

export class PresentationContentDto {
  @IsString()
  id!: string;

  @IsIn(contentTypes)
  type!: (typeof contentTypes)[number];

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class SetPreviewDto {
  @ValidateNested()
  @Type(() => PresentationContentDto)
  item!: PresentationContentDto;
}

export class ProjectScriptureDto {
  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  translation?: string;
}
