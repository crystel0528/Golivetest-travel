"use strict";
/// <reference types="k6" />
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
exports.default = default_1;
const http_1 = __importDefault(require("k6/http"));
const k6_1 = require("k6");
const data_1 = require("k6/data");
// ================================
// ✅ Load destinations JSON
// ================================
const destinations = new data_1.SharedArray('destinations', () => JSON.parse(open('../data/destinations.json')));
// ================================
// ✅ k6 options
// ================================
exports.options = {
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
function default_1() {
    // Pick a random destination
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    // 1️⃣ SEARCH ACTIVITIES
    const searchPayload = JSON.stringify({
        destinationId: destination.destinationId,
        destinationName: destination.destinationName,
        destinationType: destination.destinationType,
    });
    const searchRes = http_1.default.post('https://dev-api.travelinsider.co/api/xeni/search-activities', searchPayload, { headers });
    // Cast response to known type
    const searchJson = searchRes.json();
    if (!searchJson?.data?.length)
        return;
    const activity = searchJson.data[0];
    const activityId = activity.activityId;
    const rateCode = activity.rateCode;
    (0, k6_1.check)(searchRes, { 'search success': (r) => r.status === 200 });
    (0, k6_1.sleep)(1);
    // 2️⃣ CHECK AVAILABILITY
    const availabilityPayload = JSON.stringify({
        activityId,
        date: '2026-03-01',
        guests: 2,
    });
    const availRes = http_1.default.post('https://dev-api.travelinsider.co/api/xeni/check-availability', availabilityPayload, { headers });
    (0, k6_1.check)(availRes, { 'availability success': (r) => r.status === 200 });
    (0, k6_1.sleep)(1);
    // 3️⃣ RATE DETAILS
    const rateRes = http_1.default.get(`https://dev-api.travelinsider.co/api/xeni/activity-details/${activityId}P1?include=all&currency=USD&lang=en-US`, { headers });
    (0, k6_1.check)(rateRes, { 'rate success': (r) => r.status === 200 });
    (0, k6_1.sleep)(1);
    // 4️⃣ BOOK ACTIVITY
    const bookingPayload = JSON.stringify({
        activityId,
        guests: 2,
        date: '2026-03-01',
        rateCode,
    });
    const bookRes = http_1.default.post('https://dev-api.travelinsider.co/api/xeni/book-activity', bookingPayload, { headers });
    (0, k6_1.check)(bookRes, { 'booking success': (r) => r.status === 200 || r.status === 201 });
    (0, k6_1.sleep)(1);
    // 5️⃣ OPTIONAL: CHECK USER BOOKING
    const bookingJson = bookRes.json();
    const bookingId = bookingJson?.bookingId;
    if (bookingId) {
        const bookingRes = http_1.default.get(`https://dev-api.travelinsider.co/api/user/bookings/${bookingId}`, { headers });
        (0, k6_1.check)(bookingRes, { 'user booking fetched': (r) => r.status === 200 });
    }
    (0, k6_1.sleep)(2);
}
