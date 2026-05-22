import { IsOptional, IsString } from 'class-validator';

export class DetectSpeechDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  translation?: string;
}
