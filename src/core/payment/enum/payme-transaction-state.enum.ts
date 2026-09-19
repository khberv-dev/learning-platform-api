export enum PaymeTransactionState {
  CREATED = 1,
  PERFORMED = 2,
  CANCELLED = -1,
  CANCELLED_AFTER_PERFORM = -2,
}

export enum PaymeCancelReason {
  TIMEOUT = 4,
}
