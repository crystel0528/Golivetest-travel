import http from 'k6/http';
import { sleep } from 'k6';

// ✅ Thresholds defined here
export let options = {
  thresholds: {
    'http_req_duration{module:homepage}': ['p(95)<3000'],
    'http_req_duration{module:search}': ['p(95)<5000'],
    'http_req_duration{module:detail}': ['p(95)<4000'],
    'http_req_duration{module:checkout}': ['p(95)<5000'],
    'http_req_duration{module:payment}': ['p(95)<7000'],
    'http_req_failed': ['rate<0.02'],
    'iteration_duration': ['p(95)<15s'],
  },
  vus: 150,        // Max virtual users
  duration: '25m', // Total test duration
};

export default function () {
  // Homepage
  http.get('https://yourtravel.com', { tags: { module: 'homepage' } });
  sleep(1);

  // Search
  http.get('https://yourtravel.com/search?from=NYC&to=LDN', { tags: { module: 'search' } });
  sleep(1);

  // Detail page
  http.get('https://yourtravel.com/hotel/123', { tags: { module: 'detail' } });
  sleep(1);

  // Checkout
  http.post('https://yourtravel.com/checkout', { items: [...] }, { tags: { module: 'checkout' } });
  sleep(1);

  // Payment
  http.post('https://yourtravel.com/payment', { card: 'xxxx' }, { tags: { module: 'payment' } });
  sleep(1);
}
