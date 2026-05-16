import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class TranscriptionInputDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  translation?: string;

  @IsOptional()
  @IsBoolean()
  persist?: boolean;
}

export class AudioInputDto {
  @IsString()
  audioBase64!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
