export type ApiError = {
    code?: string | number;
    message?: string;
};

export type ApiResponse<T extends object = object> = {
    success: boolean;
    message?: string;
    error?: ApiError;
} & T;

export type User = {
    userId: string;
    userExternalId?: string;
    authProvider: "email" | "google" | "magic_link";
    googleId?: string;
    isVerified: boolean;
    name?: string;
    email: string;
    profilePicture?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type Preferences = {
    preferenceId: string;
    preferenceExternalId?: string;
    userId: string;
    contentFilters: Array<"job_updates" | "news" | "time_date">;
    deliveryMode: "full_emails" | "smart_summary" | "dashboard_only";
    keywords: string[];
    companies: string[];
    jobTitles: string[];
    locations: string[];
    notificationSchedule: string;
    timezone: string;
    maxJobsInEmail: number;
    maxNewsInEmail: number;
    maxTimeDateItemsInEmail: number;
    emailDigestEnabled: boolean;
    aiSummaryEnabled: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type GmailAccount = {
    gmailAccountId: string;
    gmailExternalId?: string;
    userId: string;
    email: string;
    isPrimary: boolean;
    status: "connected" | "disconnected" | "token_expired";
    tokenExpiresAt?: string;
    lastSyncAt?: string;
    labels?: string[];
    createdAt?: string;
    updatedAt?: string;
};

export type JobAlert = {
    jobAlertId: string;
    source: "gmail" | "crawled" | "rss";
    status: "new" | "read" | "applied" | "archived";
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
    salary?: string;
    jobType?: string;
    postedAt?: string;
    emailSubject?: string;
    emailFrom?: string;
    emailReceivedAt?: string;
    tags?: string[];
    aiSummary?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type NewsArticle = {
    newsArticleId: string;
    title: string;
    source: string;
    author?: string;
    description?: string;
    url: string;
    imageUrl?: string;
    publishedAt?: string;
    category?: string;
    tags?: string[];
    aiSummary?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type Pagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export type JobStats = {
    totalJobs: number;
    newJobs: number;
    appliedJobs: number;
    archivedJobs: number;
    gmailJobs: number;
    crawledJobs: number;
};

export type NewsStats = {
    totalArticles: number;
    categories: Record<string, number>;
    latestPublishedAt?: string | null;
};
