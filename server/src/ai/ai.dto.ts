import { IsOptional, IsString } from 'class-validator';

export class TranscriptionInputDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class AudioInputDto {
  @IsString()
  audioBase64!: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
