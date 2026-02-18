"use strict";
//import fs from 'fs';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function globalSetup(config) {
    // Create results folder if it doesn't exist
    const resultsPath = path_1.default.join(__dirname, '..', 'test-results');
    if (!fs_1.default.existsSync(resultsPath))
        fs_1.default.mkdirSync(resultsPath, { recursive: true });
    // Set BASE_URL
    process.env.BASE_URL = 'https://dev.travelinsider.co/';
    // Print the HTML report link AFTER the tests
    const reportPath = path_1.default.join(__dirname, '../playwright-report');
    console.log(`\n✅ Playwright HTML report will be here: file://${reportPath}\n`);
}
exports.default = globalSetup;
