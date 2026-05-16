import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetVerseQueryDto {
  @IsString()
  book!: string;

  @IsInt()
  @Min(1)
  chapter!: number;

  @IsInt()
  @Min(1)
  verse!: number;

  @IsOptional()
  @IsString()
  translation?: string;
}

export class SearchScriptureQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsString()
  translation?: string;
}
