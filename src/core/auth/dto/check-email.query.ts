import { IsEmail } from 'class-validator';

export class CheckEmailQuery {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;
}
