import {Request} from "express";

/** Supported authentication providers */
export const SUPPORTED_AUTH_PROVIDERS = ['email', 'google', 'magic_link'] as const;
export type TSupportedAuthProvider = typeof SUPPORTED_AUTH_PROVIDERS[number];

/** Delivery mode for notifications */
export const DELIVERY_MODES = ['full_emails', 'smart_summary', 'dashboard_only'] as const;
export type TDeliveryMode = typeof DELIVERY_MODES[number];

/** Content filter types */
export const CONTENT_FILTERS = ['job_updates', 'news', 'time_date'] as const;
export type TContentFilter = typeof CONTENT_FILTERS[number];

/** Gmail account status */
export const GMAIL_ACCOUNT_STATUS = ['connected', 'disconnected', 'token_expired'] as const;
export type TGmailAccountStatus = typeof GMAIL_ACCOUNT_STATUS[number];

/** Job alert source */
export const JOB_ALERT_SOURCES = ['gmail', 'crawled', 'rss'] as const;
export type TJobAlertSource = typeof JOB_ALERT_SOURCES[number];

/** Job alert status */
export const JOB_ALERT_STATUSES = ['new', 'read', 'applied', 'archived'] as const;
export type TJobAlertStatus = typeof JOB_ALERT_STATUSES[number];

/** Authenticated request with user email attached by middleware */
export interface IAuthRequest extends Request {
    email: string;
    userId: string;
}

/** Register params */
export interface IRegisterParams {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

/** Login params */
export interface ILoginParams {
    email: string;
    password: string;
}

/** Reset password params */
export interface IResetPasswordParams {
    email: string;
    currentPassword: string;
    newPassword: string;
}

/** Refresh token params */
export interface IRefreshTokenParams {
    refreshToken: string;
}

/** Google OAuth callback params */
export interface IGoogleOAuthParams {
    code: string;
}

/** Magic link params */
export interface IGenerateMagicLinkParams {
    email: string;
}

export interface IVerifyMagicLinkParams {
    token: string;
}

/** Check auth status params */
export interface ICheckAuthStatusParams {
    email: string;
}

/** Update user params */
export interface IUpdateUserParams {
    email: string;
    name?: string;
    password?: string;
    profilePicture?: string;
}

/** User preference update params */
export interface IUpdatePreferencesParams {
    userId: string;
    contentFilters?: TContentFilter[];
    deliveryMode?: TDeliveryMode;
    keywords?: string[];
    companies?: string[];
    jobTitles?: string[];
    locations?: string[];
    notificationSchedule?: string;
    timezone?: string;
    maxJobsInEmail?: number;
    maxNewsInEmail?: number;
    maxTimeDateItemsInEmail?: number;
}
