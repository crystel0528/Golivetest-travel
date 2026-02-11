import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';

const activities = new SharedArray('activities', function () {
  return JSON.parse(open('../data/activities.json'));
});

export const options = {
  scenarios: {
    peak_users: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '10m', target: 150 },
        { duration: '5m', target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.02']
  }
};

export default function () {

  const activity =
    activities[Math.floor(Math.random() * activities.length)];

  // 1️⃣ Homepage
  let browse = http.get('https://dev.travelinsider.co/');
  check(browse, { 'homepage ok': (r) => r.status === 200 });

  sleep(1);

  // 2️⃣ Search
  let search = http.get(
    `https://dev.travelinsider.co/experiences/search?destinationId=${activity.destinationId}`
  );

  check(search, { 'search ok': (r) => r.status === 200 });

  sleep(1);

  // 3️⃣ Activity Detail
  let detail = http.get(
    `https://dev.travelinsider.co/experiences/${activity.slug}`
  );

  check(detail, { 'detail ok': (r) => r.status === 200 });

  sleep(1);

  // 4️⃣ Checkout
  let checkout = http.post(
    'https://dev.travelinsider.co/checkout',
    JSON.stringify({ destinationId: activity.destinationId }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(checkout, { 'checkout ok': (r) => r.status === 200 });

  sleep(1);

  // 5️⃣ Payment
  let payment = http.post(
    'https://dev.travelinsider.co/payment/initiate',
    JSON.stringify({ destinationId: activity.destinationId }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(payment, { 'payment ok': (r) => r.status === 200 });

  sleep(2);
}
