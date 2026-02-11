import http from 'k6/http';
import { sleep, check } from 'k6';
import { SharedArray } from 'k6/data';

// Load destinations from JSON file
const destinations = new SharedArray('destinations', function() {
    return JSON.parse(open('../data/destinations.json'));
});

export const options = {
    scenarios: {
        peak_load: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '5m', target: 50 },   // normal
                { duration: '5m', target: 100 },  // busy
                { duration: '10m', target: 150 }, // peak (3x)
                { duration: '5m', target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'], // <3 seconds
        http_req_failed: ['rate<0.02'],    // <2% errors
    },
};

export default function () {
    // Pick a random destination
    const destination = destinations[Math.floor(Math.random() * destinations.length)];

    // 1. Browse Activities
    let browse = http.get('https://dev.travelinsider.co/');
    check(browse, { 'browse success': (r) => r.status === 200 });

    sleep(1);

    // 2. Search Availability
    let searchPayload = {
        destinationId: destination.destinationId,
        date: '2026-02-10',   // can also randomize
        guests: 2
    };

    let search = http.post('https://dev.travelinsider.co/experiences/search', JSON.stringify(searchPayload), {
        headers: { 'Content-Type': 'application/json' },
    });

    check(search, { 'search success': (r) => r.status === 200 && r.json('data').length > 0 });

    sleep(1);

    // 3. Checkout
    let checkoutPayload = {
        destinationId: destination.destinationId,
        guests: 2
    };

    let checkout = http.post('https://dev.travelinsider.co/checkout', JSON.stringify(checkoutPayload), {
        headers: { 'Content-Type': 'application/json' },
    });
    check(checkout, { 'checkout success': (r) => r.status === 200 });

    sleep(1);

    // 4. Payment Initiation
    let paymentPayload = {
        destinationId: destination.destinationId
    };

    let payment = http.post('https://dev.travelinsider.co/payment/initiate', JSON.stringify(paymentPayload), {
        headers: { 'Content-Type': 'application/json' },
    });
    check(payment, { 'payment success': (r) => r.status === 200 });

    sleep(2);
}
 