import type { BookingStatus } from '../db/schema';

type AllowedTransitions = Partial<Record<BookingStatus, BookingStatus[]>>;

export const ALLOWED_TRANSITIONS: AllowedTransitions = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed', 'refunded'],
};
