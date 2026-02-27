/// <reference types="k6" />

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ================================
// ✅ Define interfaces
// ================================
interface Destination {
  activityId: string | number;
  rateCode?: string;
  destinationId: string | number;
  destinationName: string;
  destinationType: 'CITY' | 'COUNTRY';
  title?: string;
}

interface Activity {
  activityId: string | number;
  rateCode?: string;
}

interface SearchResponse {
  data: Activity[];
}

// ================================
// ✅ Load destinations JSON
// ================================
// bundling-ready path
const destinations = new SharedArray<Destination>('destinations', () =>
  JSON.parse(open('./data/destinations.json')) as Destination[]
);

// ================================
// ✅ k6 options
// ================================
export const options = {
  scenarios: {
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '10m', target: 150 },
        { duration: '5m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.02'],
  },
};

// ================================
// ✅ Headers
// ================================
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_TOKEN_HERE',
};

// ================================
// ✅ Main function
// ================================
export default function () {
  // Pick a random destination
  const destination: Destination =
    destinations[Math.floor(Math.random() * destinations.length)];

  // 1️⃣ SEARCH ACTIVITIES
  const searchPayload = JSON.stringify({
    destinationId: destination.destinationId,
    destinationName: destination.destinationName,
    destinationType: destination.destinationType,
  });

  const searchRes = http.post(
    'https://dev-api.travelinsider.co/api/xeni/search-activities',
    searchPayload,
    { headers }
  );

  // Cast response to known type
  const searchJson = (searchRes.json() as unknown) as SearchResponse;

  if (!searchJson?.data?.length) return;

  const activity: Activity = searchJson.data[0];
  const activityId = activity.activityId;
  const rateCode = activity.rateCode;

  check(searchRes, { 'search success': (r) => r.status === 200 });

  sleep(1);

  // 2️⃣ CHECK AVAILABILITY
  const availabilityPayload = JSON.stringify({
    activityId,
    date: '2026-03-01',
    guests: 2,
  });

  const availRes = http.post(
    'https://dev-api.travelinsider.co/api/xeni/check-availability',
    availabilityPayload,
    { headers }
  );
  check(availRes, { 'availability success': (r) => r.status === 200 });

  sleep(1);

  // 3️⃣ RATE DETAILS
  const rateRes = http.get(
    `https://dev-api.travelinsider.co/api/xeni/activity-details/${activityId}?include=all&currency=USD&lang=en-US`,
    { headers }
  );
  check(rateRes, { 'rate success': (r) => r.status === 200 });

  sleep(1);

  // 4️⃣ BOOK ACTIVITY
  const bookingPayload = JSON.stringify({
    activityId,
    guests: 2,
    date: '2026-03-01',
    rateCode,
  });

  const bookRes = http.post(
    'https://dev-api.travelinsider.co/api/xeni/book-activity',
    bookingPayload,
    { headers }
  );
  check(bookRes, { 'booking success': (r) => r.status === 200 || r.status === 201 });

  sleep(1);

  // 5️⃣ OPTIONAL: CHECK USER BOOKING
  const bookingJson = bookRes.json() as any;
  const bookingId = bookingJson?.bookingId;
  if (bookingId) {
    const bookingRes = http.get(
      `https://dev-api.travelinsider.co/api/user/bookings/${bookingId}`,
      { headers }
    );
    check(bookingRes, { 'user booking fetched': (r) => r.status === 200 });
  }

  sleep(2);
}
