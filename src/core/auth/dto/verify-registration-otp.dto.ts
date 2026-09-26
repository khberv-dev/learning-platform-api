import { IsString, IsUUID, Length } from 'class-validator';

export class VerifyRegistrationOtpDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
