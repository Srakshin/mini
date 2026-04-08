import "colors";
import jwt from "jsonwebtoken";
import {ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRY} from "../config/config";

export interface ITokenPayload {
    userId: string;
    email: string;
}

/**
 * Generate an access token for authenticated requests
 */
const generateAccessToken = (payload: ITokenPayload): string => {
    try {
        if (!ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET is not defined');
        }
        return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY || '30d',
        } as jwt.SignOptions);
    } catch (error: any) {
        console.error('Service Error: Failed to generate access token'.red.bold, error);
        throw error;
    }
}

/**
 * Generate a refresh token for token rotation
 */
const generateRefreshToken = (payload: ITokenPayload): string => {
    try {
        if (!REFRESH_TOKEN_SECRET) {
            throw new Error('REFRESH_TOKEN_SECRET is not defined');
        }
        return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
            expiresIn: REFRESH_TOKEN_EXPIRY || '60d',
        } as jwt.SignOptions);
    } catch (error: any) {
        console.error('Service Error: Failed to generate refresh token'.red.bold, error);
        throw error;
    }
}

/**
 * Verify an access token and return the decoded payload
 */
const verifyAccessToken = (token: string): ITokenPayload => {
    try {
        if (!ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET is not defined');
        }
        return jwt.verify(token, ACCESS_TOKEN_SECRET) as ITokenPayload;
    } catch (error: any) {
        console.error('Service Error: Failed to verify access token'.red.bold, error.message);
        throw error;
    }
}

/**
 * Verify a refresh token and return the decoded payload
 */
const verifyRefreshToken = (token: string): ITokenPayload => {
    try {
        if (!REFRESH_TOKEN_SECRET) {
            throw new Error('REFRESH_TOKEN_SECRET is not defined');
        }
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as ITokenPayload;
    } catch (error: any) {
        console.error('Service Error: Failed to verify refresh token'.red.bold, error.message);
        throw error;
    }
}

/**
 * Generate a magic link token (short-lived)
 */
const generateMagicLinkToken = (payload: ITokenPayload, expiresIn: string = '15m'): string => {
    try {
        if (!ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET is not defined');
        }
        return jwt.sign({...payload, type: 'magic_link'}, ACCESS_TOKEN_SECRET, {
            expiresIn,
        } as jwt.SignOptions);
    } catch (error: any) {
        console.error('Service Error: Failed to generate magic link token'.red.bold, error);
        throw error;
    }
}

/**
 * Verify a magic link token
 */
const verifyMagicLinkToken = (token: string): ITokenPayload & { type: string } => {
    try {
        if (!ACCESS_TOKEN_SECRET) {
            throw new Error('ACCESS_TOKEN_SECRET is not defined');
        }
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as ITokenPayload & { type: string };
        if (decoded.type !== 'magic_link') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error: any) {
        console.error('Service Error: Failed to verify magic link token'.red.bold, error.message);
        throw error;
    }
}

export {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateMagicLinkToken,
    verifyMagicLinkToken,
};
