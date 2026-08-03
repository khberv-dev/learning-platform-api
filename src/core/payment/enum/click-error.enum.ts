/** Click Merchant API xato kodlari. */
export enum ClickError {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INCORRECT_AMOUNT = -2,
  ACTION_NOT_FOUND = -3,
  ALREADY_PAID = -4,
  USER_NOT_FOUND = -5,
  TRANSACTION_NOT_FOUND = -6,
  FAILED_TO_UPDATE_USER = -7,
  BAD_REQUEST = -8,
  TRANSACTION_CANCELLED = -9,
}

export const CLICK_ERROR_NOTE: Record<ClickError, string> = {
  [ClickError.SUCCESS]: 'Success',
  [ClickError.SIGN_CHECK_FAILED]: 'SIGN CHECK FAILED!',
  [ClickError.INCORRECT_AMOUNT]: 'Incorrect parameter amount',
  [ClickError.ACTION_NOT_FOUND]: 'Action not found',
  [ClickError.ALREADY_PAID]: 'Already paid',
  [ClickError.USER_NOT_FOUND]: 'User does not exist',
  [ClickError.TRANSACTION_NOT_FOUND]: 'Transaction does not exist',
  [ClickError.FAILED_TO_UPDATE_USER]: 'Failed to update user',
  [ClickError.BAD_REQUEST]: 'Error in request from click',
  [ClickError.TRANSACTION_CANCELLED]: 'Transaction cancelled',
};
