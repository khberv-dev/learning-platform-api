import { Matches } from 'class-validator';

export class CheckPhoneQuery {
  @Matches(/^998\d{9}$/, { message: "Telefon raqam 998XXXXXXXXX formatida bo'lishi kerak" })
  phoneNumber: string;
}
