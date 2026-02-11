import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load destinations from JSON
const destinations = new SharedArray('destinations', function() {
    return JSON.parse(open('../data/destinations.json'));
});

// Base options with normal + peak scenarios
export const options = {
    scenarios: {
        normal_load: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '2m', target: 5 },  // ramp to normal users
                { duration: '16m', target: 5 },   // maintain normal load
                { duration: '2m', target: 0 },   // ramp down
            ],
        },
        /*
        peak_load: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '5m', target: 50 },   // fast ramp
                { duration: '10m', target: 100 }, // peak traffic
                { duration: '5m', target: 0 },    // ramp down
            ],
            startTime: '2h30m',  // start after normal load
        },
        */
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],
        http_req_failed: ['rate<0.02'],
    },
};

// Replace with your dev/staging token
const headers = {
    'Content-Type': 'application/json',
    'Authorization': '1089|0gwolvBwzkHbfJlGWw1xxElZPyk0MUAc6vZawS12dac59ea2'
};

export default function () {
    // 1️⃣ HOMEPAGE - all users
    const homepageRes = http.get('https://dev.travelinsider.co/', { headers });
    check(homepageRes, { 'homepage success': (r) => r.status === 200 });
    sleep(Math.random() * 2 + 1); // 1–3s

    // 2️⃣ SEARCH - ~85% of users
    if (Math.random() < 0.85) {
        const destination = destinations[Math.floor(Math.random() * destinations.length)];
        const searchPayload = JSON.stringify({
            destinationId: destination.destinationId,
            destinationName: destination.destinationName,
            destinationType: destination.destinationType
        });

        const searchRes = http.post(
            'https://dev-api.travelinsider.co/api/xeni/search-activities',
            searchPayload,
            { headers }
        );
        check(searchRes, { 'search success': (r) => r.status === 200 });
        sleep(Math.random() * 2 + 1);

        const activity = searchRes.json().data ? searchRes.json().data[0] : null;
        if (!activity) return;

        const activityId = activity.activityId;
        const rateCode = activity.rateCode;

        // 3️⃣ DETAILS - ~65% of searching users
        if (Math.random() < 0.65) {
            const detailsRes = http.get(
                `https://dev-api.travelinsider.co/api/xeni/activity-details/${activityId}?include=all&currency=USD&lang=en-US`,
                { headers }
            );
            check(detailsRes, { 'details success': (r) => r.status === 200 });
            sleep(Math.random() * 2 + 1);

            // 4️⃣ AVAILABILITY - ~50% of detail viewers
            if (Math.random() < 0.5) {
                const availabilityPayload = JSON.stringify({
                    activityId: activityId,
                    date: '2026-03-01',
                    guests: 2
                });
                const availRes = http.post(
                    'https://dev-api.travelinsider.co/api/xeni/check-availability',
                    availabilityPayload,
                    { headers }
                );
                check(availRes, { 'availability success': (r) => r.status === 200 });
                sleep(Math.random() * 2 + 1);

                /*
                // 5️⃣ BOOKING - ~20% of availability checkers
                if (Math.random() < 0.2) {
                    const bookingPayload = JSON.stringify({
                        activityId: activityId,
                        guests: 2,
                        date: '2026-03-01',
                        rateCode: rateCode
                    });
                    const bookRes = http.post(
                        'https://dev-api.travelinsider.co/api/xeni/activity-details',
                        bookingPayload,
                        { headers }
                    );
                    check(bookRes, { 'booking success': (r) => r.status === 200 || r.status === 201 });
                    sleep(Math.random() * 2 + 1);

                    // 6️⃣ CONFIRMATION - ~50% of bookings
                    const bookingId = bookRes.json().bookingId;
                    if (bookingId && Math.random() < 0.5) {
                        const confirmRes = http.get(
                            `https://dev-api.travelinsider.co/api/xeni/book-activity`,
                            { headers }
                        );
                        check(confirmRes, { 'confirmation success': (r) => r.status === 200 });
                        sleep(Math.random() * 2 + 1);
                    }
                }
                */
            }
        }
    }
}
