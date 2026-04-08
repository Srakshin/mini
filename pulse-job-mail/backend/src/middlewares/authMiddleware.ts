import "colors";
import {NextFunction, Request, Response} from "express";
import {IAuthRequest} from "../types/auth";
import SubscriberService from "../services/SubscriberService";
import {ApiResponse} from "../utils/ApiResponse";
import {verifyAccessToken} from "../utils/jwt.utils";

const getSubscriberEmailFromRequest = (req: Request) => {
    const headerEmail = req.headers['x-subscriber-email'];
    if (typeof headerEmail === 'string' && headerEmail.trim()) {
        return headerEmail;
    }

    const queryEmail = req.query.email;
    if (typeof queryEmail === 'string' && queryEmail.trim()) {
        return queryEmail;
    }

    const bodyEmail = req.body?.email;
    if (typeof bodyEmail === 'string' && bodyEmail.trim()) {
        return bodyEmail;
    }

    return null;
};

/**
 * Resolve the current user from either a JWT token or a subscriber email.
 */
const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            if (!token) {
                console.warn('Client Error: Empty token after Bearer prefix'.yellow);
                res.status(401).send(new ApiResponse({
                    success: false,
                    errorCode: 'AUTH_TOKEN_MISSING',
                    errorMsg: 'Authorization token is required',
                }));
                return;
            }

            const decoded = verifyAccessToken(token);
            (req as IAuthRequest).email = decoded.email;
            (req as IAuthRequest).userId = decoded.userId;
            next();
            return;
        }

        const subscriberEmail = getSubscriberEmailFromRequest(req);
        if (!subscriberEmail) {
            console.warn('Client Error: Missing subscriber email'.yellow);
            res.status(401).send(new ApiResponse({
                success: false,
                errorCode: 'SUBSCRIBER_EMAIL_MISSING',
                errorMsg: 'Subscriber email is required',
            }));
            return;
        }

        if (!SubscriberService.isValidEmail(subscriberEmail)) {
            console.warn('Client Error: Invalid subscriber email'.yellow, {subscriberEmail});
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: 'SUBSCRIBER_EMAIL_INVALID',
                errorMsg: 'A valid subscriber email is required',
            }));
            return;
        }

        const user = await SubscriberService.findOrCreateSubscriberByEmail(subscriberEmail);
        (req as IAuthRequest).email = user.email;
        (req as IAuthRequest).userId = String(user._id);
        next();
    } catch (error: any) {
        console.error('Middleware Error: Authentication failed'.red.bold, error.message);

        if (error.name === 'TokenExpiredError') {
            res.status(401).send(new ApiResponse({
                success: false,
                errorCode: 'AUTH_TOKEN_EXPIRED',
                errorMsg: 'Token has expired. Please refresh your token',
            }));
            return;
        }

        if (error.name === 'JsonWebTokenError') {
            res.status(401).send(new ApiResponse({
                success: false,
                errorCode: 'AUTH_TOKEN_INVALID',
                errorMsg: 'Invalid authentication token',
            }));
            return;
        }

        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: 'AUTH_ERROR',
            errorMsg: 'Authentication failed',
        }));
    }
};

export default authMiddleware;
