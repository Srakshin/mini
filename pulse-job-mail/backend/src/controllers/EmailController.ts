import "colors";
import {Request, Response} from "express";
import {FRONTEND_URL} from "../config/config";
import {ApiResponse} from "../utils/ApiResponse";
import {generateInvalidCode, generateMissingCode, generateNotFoundCode} from "../utils/generateErrorCodes";
import {IAuthRequest} from "../types/auth";
import JobAlertModel from "../models/JobAlertSchema";
import GmailFetchService from "../services/GmailFetchService";
import EmailForwardService from "../services/EmailForwardService";
import NewsAggregatorService from "../services/NewsAggregatorService";
import UserPreferencesService from "../services/UserPreferencesService";

const parseBoolean = (value: unknown) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value === 'true';
    }

    return false;
};

const shouldRedirectToFrontend = (req: Request) => {
    return req.headers.accept?.includes('text/html');
};

const buildFrontendRedirectUrl = (path: string, params: Record<string, string | undefined>) => {
    const url = new URL(path, FRONTEND_URL || 'http://localhost:5173');

    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
};

const dedupeDeliveryJobs = (jobs: Array<{
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
    postedAt?: Date;
    aiSummary?: string;
    source?: string;
}>) => {
    const seen = new Set<string>();

    return jobs.filter((job) => {
        const key = `${job.url || ''}|${job.title}|${job.company}`;
        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

const getGmailConnectUrlController = async (req: Request, res: Response) => {
    console.info('Controller: getGmailConnectUrlController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const isPrimary = parseBoolean(req.query.isPrimary || req.body?.isPrimary);
        const {authUrl, state} = await GmailFetchService.generateConnectUrl(userId, isPrimary);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Gmail connect URL generated successfully',
            authUrl,
            state,
        }));
    } catch (error: any) {
        console.error('Controller Error: getGmailConnectUrlController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to generate Gmail connect URL',
        }));
    }
};

const connectGmailCallbackController = async (req: Request, res: Response) => {
    console.info('Controller: connectGmailCallbackController started'.bgBlue.white.bold);

    try {
        const code = req.query.code as string;
        const state = req.query.state as string;

        if (!code) {
            if (shouldRedirectToFrontend(req)) {
                res.redirect(buildFrontendRedirectUrl('/gmail/callback', {
                    success: 'false',
                    error: 'Google authorization code is missing',
                }));
                return;
            }

            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateMissingCode('code'),
                errorMsg: 'Google authorization code is missing',
            }));
            return;
        }

        if (!state) {
            if (shouldRedirectToFrontend(req)) {
                res.redirect(buildFrontendRedirectUrl('/gmail/callback', {
                    success: 'false',
                    error: 'OAuth state is missing',
                }));
                return;
            }

            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateMissingCode('state'),
                errorMsg: 'OAuth state is missing',
            }));
            return;
        }

        const {account, error} = await GmailFetchService.connectAccountFromCallback(code, state);

        if (error) {
            const statusCode = error === generateNotFoundCode('user') ? 404 : 400;

            if (shouldRedirectToFrontend(req)) {
                res.redirect(buildFrontendRedirectUrl('/gmail/callback', {
                    success: 'false',
                    error: 'Failed to connect Gmail account',
                }));
                return;
            }

            res.status(statusCode).send(new ApiResponse({
                success: false,
                errorCode: error,
                errorMsg: 'Failed to connect Gmail account',
            }));
            return;
        }

        if (!account) {
            if (shouldRedirectToFrontend(req)) {
                res.redirect(buildFrontendRedirectUrl('/gmail/callback', {
                    success: 'false',
                    error: 'Gmail account details were not returned',
                }));
                return;
            }

            res.status(500).send(new ApiResponse({
                success: false,
                errorCode: generateInvalidCode('gmail_connection'),
                errorMsg: 'Gmail account details were not returned',
            }));
            return;
        }

        if (shouldRedirectToFrontend(req)) {
            res.redirect(buildFrontendRedirectUrl('/gmail/callback', {
                success: 'true',
                email: account.email,
            }));
            return;
        }

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Gmail account connected successfully',
            account,
        }));
    } catch (error: any) {
        console.error('Controller Error: connectGmailCallbackController failed'.red.bold, error);

        if (shouldRedirectToFrontend(req)) {
            res.redirect(buildFrontendRedirectUrl('/gmail/callback', {
                success: 'false',
                error: error.message || 'Failed to connect Gmail account',
            }));
            return;
        }

        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: generateInvalidCode('gmail_connection'),
            errorMsg: error.message || 'Failed to connect Gmail account',
        }));
    }
};

const listGmailAccountsController = async (req: Request, res: Response) => {
    console.info('Controller: listGmailAccountsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {accounts} = await GmailFetchService.listUserAccounts(userId);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Connected Gmail accounts fetched successfully',
            accounts,
        }));
    } catch (error: any) {
        console.error('Controller Error: listGmailAccountsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to fetch connected Gmail accounts',
        }));
    }
};

const setPrimaryGmailAccountController = async (req: Request, res: Response) => {
    console.info('Controller: setPrimaryGmailAccountController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {gmailAccountId} = req.params;

        if (!gmailAccountId) {
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateMissingCode('gmail_account_id'),
                errorMsg: 'Gmail account id is missing',
            }));
            return;
        }

        const {account, error} = await GmailFetchService.setPrimaryAccount(userId, gmailAccountId);
        if (error) {
            res.status(404).send(new ApiResponse({
                success: false,
                errorCode: error,
                errorMsg: 'Gmail account not found',
            }));
            return;
        }

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Primary Gmail account updated successfully',
            account,
        }));
    } catch (error: any) {
        console.error('Controller Error: setPrimaryGmailAccountController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to set primary Gmail account',
        }));
    }
};

const disconnectGmailAccountController = async (req: Request, res: Response) => {
    console.info('Controller: disconnectGmailAccountController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {gmailAccountId} = req.params;

        if (!gmailAccountId) {
            res.status(400).send(new ApiResponse({
                success: false,
                errorCode: generateMissingCode('gmail_account_id'),
                errorMsg: 'Gmail account id is missing',
            }));
            return;
        }

        const {disconnected, error} = await GmailFetchService.disconnectAccount(userId, gmailAccountId);
        if (error) {
            res.status(404).send(new ApiResponse({
                success: false,
                errorCode: error,
                errorMsg: 'Gmail account not found',
            }));
            return;
        }

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Gmail account disconnected successfully',
            disconnected,
        }));
    } catch (error: any) {
        console.error('Controller Error: disconnectGmailAccountController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to disconnect Gmail account',
        }));
    }
};

const syncGmailAccountsController = async (req: Request, res: Response) => {
    console.info('Controller: syncGmailAccountsController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const syncResult = await GmailFetchService.syncUserAccounts(userId);

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Gmail sync completed successfully',
            syncResult,
        }));
    } catch (error: any) {
        console.error('Controller Error: syncGmailAccountsController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to sync Gmail accounts',
        }));
    }
};

const sendDigestPreviewController = async (req: Request, res: Response) => {
    console.info('Controller: sendDigestPreviewController started'.bgBlue.white.bold);

    try {
        const userId = (req as IAuthRequest).userId;
        const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(userId);
        const syncResult = await GmailFetchService.syncUserAccounts(userId);
        const recentStoredJobs = await JobAlertModel.find({userId})
            .sort({postedAt: -1, emailReceivedAt: -1, createdAt: -1})
            .limit(preferences.maxJobsInEmail === 0 ? 100 : Math.max(12, preferences.maxJobsInEmail));
        const {articles} = await NewsAggregatorService.getNewsForUser(userId, {
            page: 1,
            limit: preferences.maxNewsInEmail === 0 ? 100 : Math.max(10, preferences.maxNewsInEmail),
        });

        const jobs = dedupeDeliveryJobs([
            ...syncResult.jobs.map((job) => ({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                url: job.url,
                postedAt: job.postedAt,
                aiSummary: job.aiSummary,
                source: job.source,
            })),
            ...recentStoredJobs.map((job) => ({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                url: job.url,
                postedAt: job.postedAt || job.emailReceivedAt || job.createdAt,
                aiSummary: job.aiSummary,
                source: job.source,
            })),
        ]);

        const deliveryResult = await EmailForwardService.sendPreviewDigest({
            userId,
            jobs,
            news: articles.map((article) => ({
                title: article.title,
                source: article.source,
                description: article.aiSummary || article.description,
                url: article.url,
                publishedAt: article.publishedAt,
                aiSummary: article.aiSummary,
            })),
            timeDateItems: syncResult.timeDateItems,
        });

        res.status(200).send(new ApiResponse({
            success: true,
            message: 'Digest preview processed successfully',
            deliveryResult,
        }));
    } catch (error: any) {
        console.error('Controller Error: sendDigestPreviewController failed'.red.bold, error);
        res.status(500).send(new ApiResponse({
            success: false,
            errorCode: error.errorCode,
            errorMsg: error.message || 'Failed to send digest preview',
        }));
    }
};

export {
    getGmailConnectUrlController,
    connectGmailCallbackController,
    listGmailAccountsController,
    setPrimaryGmailAccountController,
    disconnectGmailAccountController,
    syncGmailAccountsController,
    sendDigestPreviewController,
};
