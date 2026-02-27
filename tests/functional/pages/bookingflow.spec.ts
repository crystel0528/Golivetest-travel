// tests/functional/pages/bookingflow.spec.ts
import { test } from '@playwright/test';
import { authenticate } from '../utils/helpers/auth.helper';
import { bookActivity } from '../utils/helpers/booking.helper';
import { completeCheckout } from '../utils/helpers/checkout.helper';

test('full booking flow', async ({ page }) => {
  const email = 'crysteline@onedigital.dev';
  const password = 'P@ssword!123';

  // Log in
  await authenticate(page, email, password, true);

  // Book an activity
  await bookActivity(page, 'Book Now', '2026-03-15');

  // Complete checkout
  await completeCheckout(page);
});