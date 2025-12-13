"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
let db;
(0, vitest_1.beforeAll)(async () => {
    process.env.PROSPECTOR_DB_PATH = ':memory:';
    db = await Promise.resolve().then(() => __importStar(require('../src/db')));
    db.initDb();
});
(0, vitest_1.beforeEach)(() => {
    db.clearProspects();
});
(0, vitest_1.describe)('dedupe rules', () => {
    (0, vitest_1.it)('dedupes by profile_url', () => {
        const first = db.upsertProspect({
            full_name: 'Jamie Doe',
            company: 'Creator Co',
            profile_url: 'https://example.com/jamie',
            title: 'Talent Manager',
        });
        const second = db.upsertProspect({
            full_name: 'Jamie Doe',
            company: 'Creator Co',
            profile_url: 'https://example.com/jamie',
            title: 'Senior Talent Manager',
        });
        (0, vitest_1.expect)(first.prospect.id).toBe(second.prospect.id);
        const stored = db.listProspects();
        (0, vitest_1.expect)(stored).toHaveLength(1);
        (0, vitest_1.expect)(stored[0].title).toContain('Senior');
    });
    (0, vitest_1.it)('dedupes by name + company when url missing', () => {
        const first = db.upsertProspect({
            full_name: 'Robin Lee',
            company: 'Talent House',
            title: 'Manager',
        });
        const second = db.upsertProspect({
            full_name: 'Robin Lee',
            company: 'Talent House',
            title: 'Director',
        });
        (0, vitest_1.expect)(first.prospect.id).toBe(second.prospect.id);
        (0, vitest_1.expect)(db.listProspects()[0].title).toBe('Director');
    });
});
