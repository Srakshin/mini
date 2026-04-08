import "colors";
import {google} from "googleapis";
import {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GMAIL_REDIRECT_URI} from "../config/config";

/**
 * Create a base OAuth2 client for user authentication (login)
 */
const createAuthOAuth2Client = () => {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI,
    );
};

/**
 * Create an OAuth2 client for Gmail API access (connecting email accounts)
 */
const createGmailOAuth2Client = () => {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GMAIL_REDIRECT_URI,
    );
};

/**
 * Generate the Google OAuth URL for user login
 */
const getAuthUrl = async (): Promise<string> => {
    const oauth2Client = createAuthOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });
};

/**
 * Generate the Google OAuth URL for Gmail API connection
 * Includes Gmail read-only scope for fetching job alert emails
 */
const getGmailAuthUrl = async (state?: string): Promise<string> => {
    const oauth2Client = createGmailOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: true,
        state: state || '',
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.labels',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });
};

/**
 * Exchange authorization code for tokens (user login)
 */
const getTokensFromCode = async (code: string) => {
    try {
        const oauth2Client = createAuthOAuth2Client();
        const {tokens} = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        return {oauth2Client, tokens};
    } catch (error: any) {
        console.error('Service Error: Failed to exchange auth code for tokens'.red.bold, error.message);
        throw error;
    }
};

/**
 * Exchange authorization code for Gmail tokens (email connection)
 */
const getGmailTokensFromCode = async (code: string) => {
    try {
        const oauth2Client = createGmailOAuth2Client();
        const {tokens} = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        return {oauth2Client, tokens};
    } catch (error: any) {
        console.error('Service Error: Failed to exchange Gmail auth code for tokens'.red.bold, error.message);
        throw error;
    }
};

/**
 * Get user info from Google (for login/registration)
 */
const getGoogleUserInfo = async (oauth2Client: any) => {
    try {
        const oauth2 = google.oauth2({version: 'v2', auth: oauth2Client});
        const {data} = await oauth2.userinfo.get();
        return data;
    } catch (error: any) {
        console.error('Service Error: Failed to fetch Google user info'.red.bold, error.message);
        throw error;
    }
};

/**
 * Refresh an expired Gmail access token using the stored refresh token
 */
const refreshGmailAccessToken = async (refreshToken: string) => {
    try {
        const oauth2Client = createGmailOAuth2Client();
        oauth2Client.setCredentials({refresh_token: refreshToken});
        const {credentials} = await oauth2Client.refreshAccessToken();
        return credentials;
    } catch (error: any) {
        console.error('Service Error: Failed to refresh Gmail access token'.red.bold, error.message);
        throw error;
    }
};

export {
    createAuthOAuth2Client,
    createGmailOAuth2Client,
    getAuthUrl,
    getGmailAuthUrl,
    getTokensFromCode,
    getGmailTokensFromCode,
    getGoogleUserInfo,
    refreshGmailAccessToken,
};
