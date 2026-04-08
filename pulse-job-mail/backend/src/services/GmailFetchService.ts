import "colors";
import jwt from "jsonwebtoken";
import {gmail_v1, google} from "googleapis";
import GmailAccountModel, {IGmailAccount} from "../models/GmailAccountSchema";
import UserModel from "../models/UserSchema";
import {ACCESS_TOKEN_SECRET} from "../config/config";
import {decrypt, encrypt} from "../utils/encryption";
import {
    createGmailOAuth2Client,
    getGmailAuthUrl,
    getGmailTokensFromCode,
    getGoogleUserInfo,
    refreshGmailAccessToken,
} from "../utils/gmailOAuth.helper";
import {generateInvalidCode, generateNotFoundCode} from "../utils/generateErrorCodes";
import JobParserService, {TParsedGmailMessage} from "./JobParserService";
import UserPreferencesService from "./UserPreferencesService";

export type TGmailDigestItem = {
    gmailAccountId: string;
    gmailAccountEmail: string;
    messageId: string;
    subject: string;
    from: string;
    snippet: string;
    body: string;
    receivedAt?: Date;
};

export type TAccountSyncResult = {
    gmailAccountId: string;
    email: string;
    processedMessages: number;
    jobsCreated: number;
    newsItems: TGmailDigestItem[];
    timeDateItems: TGmailDigestItem[];
    errors: string[];
};

export type TUserSyncResult = {
    userId: string;
    jobs: any[];
    newsItems: TGmailDigestItem[];
    timeDateItems: TGmailDigestItem[];
    accounts: TAccountSyncResult[];
};

const PROCESSED_LABEL_NAME = 'PulseJobMail/Processed';
const GMAIL_CONNECT_STATE_EXPIRY = '15m';

const decodeBase64Url = (value?: string | null) => {
    if (!value) {
        return '';
    }

    return Buffer.from(
        value.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
    ).toString('utf8');
};

const stripHtml = (value?: string) => {
    return (value || '')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
};

const readHeader = (headers: Array<{name?: string | null; value?: string | null}> | undefined, name: string) => {
    return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || '';
};

class GmailFetchService {

    /**
     * Generate a Google OAuth URL for Gmail account connection.
     */
    static async generateConnectUrl(userId: string, isPrimary: boolean = false) {
        try {
            console.log('Service: GmailFetchService.generateConnectUrl called'.cyan.italic, {userId, isPrimary});

            if (!ACCESS_TOKEN_SECRET) {
                throw new Error('ACCESS_TOKEN_SECRET is not defined');
            }

            const state = jwt.sign({userId, isPrimary, type: 'gmail_connect'}, ACCESS_TOKEN_SECRET, {
                expiresIn: GMAIL_CONNECT_STATE_EXPIRY,
            });

            const authUrl = await getGmailAuthUrl(state);
            console.log('SUCCESS: Gmail connect URL generated'.bgGreen.bold, {userId});
            return {authUrl, state};
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.generateConnectUrl failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Connect a Gmail account from Google OAuth callback data.
     */
    static async connectAccountFromCallback(code: string, state: string) {
        try {
            console.log('Service: GmailFetchService.connectAccountFromCallback called'.cyan.italic);

            if (!ACCESS_TOKEN_SECRET) {
                throw new Error('ACCESS_TOKEN_SECRET is not defined');
            }

            const decodedState = jwt.verify(state, ACCESS_TOKEN_SECRET) as {
                userId: string;
                isPrimary?: boolean;
                type: string;
            };

            if (decodedState.type !== 'gmail_connect') {
                console.warn('Client Error: Invalid Gmail OAuth state supplied'.yellow);
                return {error: generateInvalidCode('gmail_state')};
            }

            const user = await UserModel.findById(decodedState.userId);
            if (!user) {
                return {error: generateNotFoundCode('user')};
            }

            const {oauth2Client, tokens} = await getGmailTokensFromCode(code);
            const googleUser = await getGoogleUserInfo(oauth2Client);
            const email = googleUser.email?.toLowerCase();

            if (!email) {
                return {error: generateInvalidCode('email_address')};
            }

            const existingPrimaryAccount = await GmailAccountModel.findOne({
                userId: user._id,
                isPrimary: true,
            });

            const existingAccount = await GmailAccountModel.findOne({
                userId: user._id,
                email,
            }).select('+refreshTokenEncrypted');

            const resolvedRefreshToken = tokens.refresh_token
                || (existingAccount?.refreshTokenEncrypted ? decrypt(existingAccount.refreshTokenEncrypted) : undefined);

            if (!tokens.access_token || !resolvedRefreshToken) {
                console.warn('Service Warning: Gmail token exchange did not yield a durable refresh token'.yellow, {email});
                return {error: 'GMAIL_TOKEN_EXCHANGE_FAILED'};
            }

            const shouldBecomePrimary = Boolean(decodedState.isPrimary || !existingPrimaryAccount || existingAccount?.isPrimary);
            if (shouldBecomePrimary) {
                await GmailAccountModel.updateMany({userId: user._id}, {$set: {isPrimary: false}});
            }

            const account = await GmailAccountModel.findOneAndUpdate(
                {userId: user._id, email},
                {
                    $set: {
                        email,
                        isPrimary: shouldBecomePrimary,
                        status: 'connected',
                        accessTokenEncrypted: encrypt(tokens.access_token),
                        refreshTokenEncrypted: encrypt(resolvedRefreshToken),
                        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                        lastSyncAt: existingAccount?.lastSyncAt,
                        labels: ['INBOX'],
                    },
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                },
            );

            console.log('SUCCESS: Gmail account connected'.bgGreen.bold, {
                userId: user._id,
                email: account.email,
            });
            return {account};
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.connectAccountFromCallback failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * List all Gmail accounts connected by a user.
     */
    static async listUserAccounts(userId: string) {
        try {
            console.log('Service: GmailFetchService.listUserAccounts called'.cyan.italic, {userId});

            const accounts = await GmailAccountModel.find({userId}).sort({isPrimary: -1, createdAt: 1});
            console.log('SUCCESS: Gmail accounts fetched'.bgGreen.bold, {userId, count: accounts.length});
            return {accounts};
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.listUserAccounts failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Promote one Gmail account to primary.
     */
    static async setPrimaryAccount(userId: string, gmailAccountId: string) {
        try {
            console.log('Service: GmailFetchService.setPrimaryAccount called'.cyan.italic, {userId, gmailAccountId});

            const account = await GmailAccountModel.findOne({_id: gmailAccountId, userId});
            if (!account) {
                return {error: generateNotFoundCode('gmail_account')};
            }

            await GmailAccountModel.updateMany({userId}, {$set: {isPrimary: false}});
            account.isPrimary = true;
            account.status = 'connected';
            await account.save();

            console.log('SUCCESS: Primary Gmail account updated'.bgGreen.bold, {userId, gmailAccountId});
            return {account};
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.setPrimaryAccount failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Disconnect and remove a Gmail account.
     */
    static async disconnectAccount(userId: string, gmailAccountId: string) {
        try {
            console.log('Service: GmailFetchService.disconnectAccount called'.cyan.italic, {userId, gmailAccountId});

            const account = await GmailAccountModel.findOne({_id: gmailAccountId, userId});
            if (!account) {
                return {error: generateNotFoundCode('gmail_account')};
            }

            const wasPrimary = account.isPrimary;
            await GmailAccountModel.deleteOne({_id: account._id});

            if (wasPrimary) {
                const replacement = await GmailAccountModel.findOne({userId}).sort({createdAt: 1});
                if (replacement) {
                    replacement.isPrimary = true;
                    await replacement.save();
                }
            }

            console.log('SUCCESS: Gmail account disconnected'.bgGreen.bold, {userId, gmailAccountId});
            return {disconnected: true};
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.disconnectAccount failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Sync all Gmail accounts connected by a specific user.
     */
    static async syncUserAccounts(userId: string) {
        try {
            console.log('Service: GmailFetchService.syncUserAccounts called'.cyan.italic, {userId});

            const accounts = await GmailAccountModel.find({userId, status: 'connected'})
                .select('+accessTokenEncrypted +refreshTokenEncrypted +syncCursor');

            const jobs: any[] = [];
            const newsItems: TGmailDigestItem[] = [];
            const timeDateItems: TGmailDigestItem[] = [];
            const accountResults: TAccountSyncResult[] = [];

            for (const account of accounts) {
                const syncResult = await this.syncSingleAccount(account);
                accountResults.push(syncResult.accountResult);
                jobs.push(...syncResult.jobs);
                newsItems.push(...syncResult.newsItems);
                timeDateItems.push(...syncResult.timeDateItems);
            }

            console.log('SUCCESS: User Gmail accounts synced'.bgGreen.bold, {
                userId,
                accounts: accountResults.length,
            });

            return {
                userId,
                jobs,
                newsItems,
                timeDateItems,
                accounts: accountResults,
            } as TUserSyncResult;
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.syncUserAccounts failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Sync every connected Gmail account in the system.
     */
    static async syncAllConnectedAccounts() {
        try {
            console.log('Service: GmailFetchService.syncAllConnectedAccounts called'.cyan.italic);

            const accounts = await GmailAccountModel.find({status: 'connected'}).select('_id userId');
            const uniqueUserIds = Array.from(new Set(accounts.map((account) => String(account.userId))));
            const results: TUserSyncResult[] = [];

            for (const userId of uniqueUserIds) {
                results.push(await this.syncUserAccounts(userId));
            }

            console.log('SUCCESS: Global Gmail sync completed'.bgGreen.bold, {users: results.length});
            return {results};
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.syncAllConnectedAccounts failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Sync one Gmail account and classify new mail.
     */
    private static async syncSingleAccount(account: IGmailAccount) {
        const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(String(account.userId));
        const client = await this.getAuthorizedClient(account);
        const gmail = google.gmail({version: 'v1', auth: client});
        const processedLabelId = await this.ensureProcessedLabel(gmail);
        const query = this.buildMessageQuery(account.lastSyncAt);

        const jobs: any[] = [];
        const newsItems: TGmailDigestItem[] = [];
        const timeDateItems: TGmailDigestItem[] = [];
        const errors: string[] = [];
        let processedMessages = 0;

        try {
            await this.refreshAccountLabelsSnapshot(account, gmail);

            const messagesResponse = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 25,
                includeSpamTrash: false,
                labelIds: (account.labels || ['INBOX']).filter((label) => ['INBOX', 'CATEGORY_UPDATES', 'IMPORTANT'].includes(label)),
            });

            const messages = messagesResponse.data.messages || [];
            for (const messageMeta of messages) {
                if (!messageMeta.id) {
                    continue;
                }

                try {
                    const messageResponse = await gmail.users.messages.get({
                        userId: 'me',
                        id: messageMeta.id,
                        format: 'full',
                    });

                    const parsedMessage = this.parseMessage(account, messageResponse.data);
                    const parsedJobs = JobParserService.extractJobsFromMessage(parsedMessage);
                    const classification = parsedJobs.length
                        ? 'job_updates'
                        : JobParserService.classifyMessage(parsedMessage);

                    const digestItem: TGmailDigestItem = {
                        gmailAccountId: String(account._id),
                        gmailAccountEmail: account.email,
                        messageId: parsedMessage.messageId,
                        subject: parsedMessage.subject,
                        from: parsedMessage.from,
                        snippet: parsedMessage.snippet,
                        body: parsedMessage.body,
                        receivedAt: parsedMessage.receivedAt,
                    };

                    if (classification === 'job_updates' && UserPreferencesService.includesFilter(preferences, 'job_updates')) {
                        const parsedJobResult = await JobParserService.parseAndStoreGmailJob(String(account.userId), parsedMessage);
                        const storedJobs = ('jobAlerts' in parsedJobResult && parsedJobResult.jobAlerts)
                            ? parsedJobResult.jobAlerts
                            : (('jobAlert' in parsedJobResult && parsedJobResult.jobAlert) ? [parsedJobResult.jobAlert] : []);
                        jobs.push(...storedJobs);
                    }

                    if (classification === 'news' && UserPreferencesService.includesFilter(preferences, 'news')) {
                        newsItems.push(digestItem);
                    }

                    if (classification === 'time_date' && UserPreferencesService.includesFilter(preferences, 'time_date')) {
                        timeDateItems.push(digestItem);
                    }

                    if (processedLabelId) {
                        await gmail.users.messages.modify({
                            userId: 'me',
                            id: messageMeta.id,
                            requestBody: {
                                addLabelIds: [processedLabelId],
                            },
                        });
                    }

                    processedMessages += 1;
                } catch (messageError: any) {
                    console.error('Service Error: Gmail message processing failed'.red.bold, {
                        account: account.email,
                        messageId: messageMeta.id,
                        message: messageError.message,
                    });
                    errors.push(messageError.message);
                }
            }

            account.lastSyncAt = new Date();
            await account.save();
        } catch (error: any) {
            console.error('Service Error: Gmail account sync failed'.red.bold, {
                email: account.email,
                message: error.message,
            });
            errors.push(error.message);
        }

        return {
            jobs,
            newsItems,
            timeDateItems,
            accountResult: {
                gmailAccountId: String(account._id),
                email: account.email,
                processedMessages,
                jobsCreated: jobs.length,
                newsItems,
                timeDateItems,
                errors,
            } as TAccountSyncResult,
        };
    }

    /**
     * Create or reuse the label used to mark processed mail.
     */
    private static async ensureProcessedLabel(gmail: gmail_v1.Gmail) {
        try {
            const labelsResponse = await gmail.users.labels.list({userId: 'me'});
            const existing = labelsResponse.data.labels?.find((label) => label.name === PROCESSED_LABEL_NAME);

            if (existing?.id) {
                return existing.id;
            }

            const created = await gmail.users.labels.create({
                userId: 'me',
                requestBody: {
                    name: PROCESSED_LABEL_NAME,
                    labelListVisibility: 'labelShow',
                    messageListVisibility: 'show',
                },
            });

            return created.data.id || undefined;
        } catch (error: any) {
            console.error('Service Error: GmailFetchService.ensureProcessedLabel failed'.red.bold, error.message);
            return undefined;
        }
    }

    /**
     * Snapshot a user's mailbox labels for later filtering.
     */
    private static async refreshAccountLabelsSnapshot(account: IGmailAccount, gmail: gmail_v1.Gmail) {
        try {
            const labelsResponse = await gmail.users.labels.list({userId: 'me'});
            const labels = (labelsResponse.data.labels || [])
                .map((label) => label.name)
                .filter((label): label is string => Boolean(label));

            account.labels = labels.length ? labels : ['INBOX'];
            await account.save();
        } catch (error: any) {
            console.warn('Service Warning: Failed to refresh Gmail label snapshot'.yellow, {
                email: account.email,
                message: error.message,
            });
        }
    }

    /**
     * Build a time-aware Gmail search query.
     */
    private static buildMessageQuery(lastSyncAt?: Date) {
        const afterQuery = lastSyncAt
            ? `after:${Math.floor(new Date(lastSyncAt).getTime() / 1000)}`
            : 'newer_than:7d';

        return `${afterQuery} -label:"${PROCESSED_LABEL_NAME}"`;
    }

    /**
     * Build a ready-to-use OAuth client, refreshing access tokens when needed.
     */
    private static async getAuthorizedClient(account: IGmailAccount) {
        const oauth2Client = createGmailOAuth2Client();
        const accessToken = decrypt((account as any).accessTokenEncrypted);
        const refreshToken = decrypt((account as any).refreshTokenEncrypted);
        const isExpired = !account.tokenExpiresAt || new Date(account.tokenExpiresAt).getTime() <= Date.now() + 60_000;

        let resolvedAccessToken = accessToken;
        let resolvedRefreshToken = refreshToken;
        let resolvedExpiryDate = account.tokenExpiresAt?.getTime();

        try {
            if (isExpired) {
                const refreshed = await refreshGmailAccessToken(refreshToken);
                if (refreshed.access_token) {
                    resolvedAccessToken = refreshed.access_token;
                }
                if (refreshed.refresh_token) {
                    resolvedRefreshToken = refreshed.refresh_token;
                }
                resolvedExpiryDate = refreshed.expiry_date || resolvedExpiryDate;

                await GmailAccountModel.findByIdAndUpdate(account._id, {
                    $set: {
                        accessTokenEncrypted: encrypt(resolvedAccessToken),
                        refreshTokenEncrypted: encrypt(resolvedRefreshToken),
                        tokenExpiresAt: resolvedExpiryDate ? new Date(resolvedExpiryDate) : undefined,
                        status: 'connected',
                    },
                });
            }
        } catch (error: any) {
            await GmailAccountModel.findByIdAndUpdate(account._id, {
                $set: {
                    status: 'token_expired',
                },
            });
            throw error;
        }

        oauth2Client.setCredentials({
            access_token: resolvedAccessToken,
            refresh_token: resolvedRefreshToken,
            expiry_date: resolvedExpiryDate,
        });

        return oauth2Client;
    }

    /**
     * Convert Gmail API message data into a normalized payload.
     */
    private static parseMessage(account: IGmailAccount, message: gmail_v1.Schema$Message): TParsedGmailMessage {
        const payload = message.payload || {};
        const subject = readHeader(payload.headers, 'Subject');
        const from = readHeader(payload.headers, 'From');
        const senderEmail = readHeader(payload.headers, 'Reply-To') || readHeader(payload.headers, 'Return-Path') || from;
        const dateHeader = readHeader(payload.headers, 'Date');
        const extractedBodies = this.extractMessageBodies(payload);
        const plainBody = extractedBodies.text || stripHtml(extractedBodies.html);
        const body = stripHtml(plainBody);

        return {
            messageId: message.id || '',
            threadId: message.threadId || undefined,
            gmailAccountId: String(account._id),
            gmailAccountEmail: account.email,
            from,
            senderEmail: senderEmail.toLowerCase(),
            subject,
            snippet: stripHtml(message.snippet || body.slice(0, 280)),
            body,
            htmlBody: extractedBodies.html,
            receivedAt: dateHeader ? new Date(dateHeader) : (message.internalDate ? new Date(Number(message.internalDate)) : undefined),
            labelIds: message.labelIds || [],
        };
    }

    /**
     * Recursively extract both text/plain and text/html bodies from Gmail payload parts.
     */
    private static extractMessageBodies(payload: gmail_v1.Schema$MessagePart | undefined): {text: string; html: string} {
        const result = {text: '', html: ''};

        const walk = (part: gmail_v1.Schema$MessagePart | undefined) => {
            if (!part) {
                return;
            }

            if (part.mimeType === 'text/plain' && part.body?.data && !result.text) {
                result.text = decodeBase64Url(part.body.data);
            }

            if (part.mimeType === 'text/html' && part.body?.data && !result.html) {
                result.html = decodeBase64Url(part.body.data);
            }

            if (part.body?.data && !part.mimeType && !result.text) {
                result.text = decodeBase64Url(part.body.data);
            }

            (part.parts || []).forEach((childPart) => walk(childPart));
        };

        walk(payload);
        return result;
    }
}

export default GmailFetchService;
