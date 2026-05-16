import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const songSegmentTypes = ['verse', 'chorus', 'bridge', 'tag', 'intro', 'outro'] as const;

export class SongSegmentDto {
  @IsIn(songSegmentTypes)
  type!: (typeof songSegmentTypes)[number];

  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  content!: string;
}

export class CreateSongDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  defaultKey?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SongSegmentDto)
  verses!: SongSegmentDto[];
}

export class UpdateSongDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  defaultKey?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SongSegmentDto)
  verses?: SongSegmentDto[];
}
