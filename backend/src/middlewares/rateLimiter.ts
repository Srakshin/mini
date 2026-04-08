import "colors";
import rateLimit from "express-rate-limit";
import {ApiResponse} from "../utils/ApiResponse";
import {
    AUTH_WINDOW_MS,
    AUTH_MAX_REQUESTS,
    USER_PREFERENCES_WINDOW_MS,
    USER_PREFERENCES_MAX_REQUESTS,
    GMAIL_WINDOW_MS,
    GMAIL_MAX_REQUESTS,
    JOB_CRAWL_WINDOW_MS,
    JOB_CRAWL_MAX_REQUESTS,
    AI_WINDOW_MS,
    AI_MAX_REQUESTS,
} from "../config/config";

/**
 * Create a rate limiter with a specific config
 */
const createRateLimiter = (windowMs: number, maxRequests: number, limitName: string) => {
    return rateLimit({
        windowMs,
        max: maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        message: new ApiResponse({
            success: false,
            errorCode: 'RATE_LIMIT_EXCEEDED',
            errorMsg: `Too many ${limitName} requests. Please try again later`,
        }),
        handler: (req, res) => {
            console.warn(`Rate Limit: ${limitName} limit exceeded for IP ${req.ip}`.yellow);
            res.status(429).send(new ApiResponse({
                success: false,
                errorCode: 'RATE_LIMIT_EXCEEDED',
                errorMsg: `Too many ${limitName} requests. Please try again later`,
            }));
        },
    });
};

/** Auth endpoints rate limiter */
const authRateLimiter = createRateLimiter(
    Number(AUTH_WINDOW_MS) || 900000,
    Number(AUTH_MAX_REQUESTS) || 10,
    'authentication',
);

/** User preferences rate limiter */
const preferencesRateLimiter = createRateLimiter(
    Number(USER_PREFERENCES_WINDOW_MS) || 900000,
    Number(USER_PREFERENCES_MAX_REQUESTS) || 10,
    'preferences',
);

/** Gmail/email operations rate limiter */
const gmailRateLimiter = createRateLimiter(
    Number(GMAIL_WINDOW_MS) || 300000,
    Number(GMAIL_MAX_REQUESTS) || 20,
    'Gmail',
);

/** Job crawling endpoints rate limiter */
const jobCrawlerRateLimiter = createRateLimiter(
    Number(JOB_CRAWL_WINDOW_MS) || 900000,
    Number(JOB_CRAWL_MAX_REQUESTS) || 50,
    'job crawling',
);

/** AI operations rate limiter */
const aiRateLimiter = createRateLimiter(
    Number(AI_WINDOW_MS) || 300000,
    Number(AI_MAX_REQUESTS) || 30,
    'AI',
);

export {authRateLimiter, preferencesRateLimiter, gmailRateLimiter, jobCrawlerRateLimiter, aiRateLimiter};
