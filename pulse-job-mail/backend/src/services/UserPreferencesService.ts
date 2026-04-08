import "colors";
import UserPreferenceModel, {IUserPreference} from "../models/UserPreferenceSchema";
import {CONTENT_FILTERS, DELIVERY_MODES, IUpdatePreferencesParams, TContentFilter} from "../types/auth";
import {generateInvalidCode} from "../utils/generateErrorCodes";

type TJobPreferenceMatchInput = {
    title?: string;
    company?: string;
    location?: string;
    description?: string;
    tags?: string[];
};

type TNewsPreferenceMatchInput = {
    title?: string;
    source?: string;
    description?: string;
    category?: string;
    tags?: string[];
};

const DEFAULT_NOTIFICATION_SCHEDULE = '0 9 * * *';
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_MAX_JOBS_IN_EMAIL = 6;
const DEFAULT_MAX_NEWS_IN_EMAIL = 6;
const DEFAULT_MAX_TIME_DATE_ITEMS_IN_EMAIL = 4;

const normalizeString = (value?: string | null) => {
    return (value || '').trim().toLowerCase();
};

const normalizeStringArray = (values?: string[]) => {
    return Array.from(new Set(
        (values || [])
            .map((value) => normalizeString(value))
            .filter(Boolean),
    ));
};

const normalizeEmailItemCount = (value: unknown, fallback: number) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return fallback;
    }

    return Math.floor(numericValue);
};

const includesAny = (haystack: string, needles: string[]) => {
    if (!needles.length) {
        return true;
    }

    return needles.some((needle) => haystack.includes(needle));
};

const getDatePartsForTimezone = (date: Date, timezone: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
    });

    const parts = formatter.formatToParts(date);
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value || '';
    const weekdayLookup: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };

    return {
        minute: Number(lookup('minute')),
        hour: Number(lookup('hour')),
        day: Number(lookup('day')),
        month: Number(lookup('month')),
        weekday: weekdayLookup[lookup('weekday')] ?? 0,
    };
};

const expandCronSegment = (segment: string, min: number, max: number) => {
    const values = new Set<number>();

    const addRange = (start: number, end: number, step: number = 1) => {
        for (let current = start; current <= end; current += step) {
            if (current >= min && current <= max) {
                values.add(current);
            }
        }
    };

    if (segment === '*') {
        addRange(min, max);
        return values;
    }

    const [rangePart, stepPart] = segment.split('/');
    const step = stepPart ? Number(stepPart) : 1;

    if (!Number.isFinite(step) || step <= 0) {
        return values;
    }

    if (rangePart === '*') {
        addRange(min, max, step);
        return values;
    }

    if (rangePart.includes('-')) {
        const [startRaw, endRaw] = rangePart.split('-');
        const start = Number(startRaw);
        const end = Number(endRaw);
        if (Number.isFinite(start) && Number.isFinite(end) && start <= end) {
            addRange(start, end, step);
        }
        return values;
    }

    const numericValue = Number(rangePart);
    if (Number.isFinite(numericValue) && numericValue >= min && numericValue <= max) {
        values.add(numericValue);
    }

    return values;
};

const matchesCronField = (field: string, value: number, min: number, max: number) => {
    const segments = field.split(',').map((segment) => segment.trim()).filter(Boolean);

    if (!segments.length) {
        return false;
    }

    return segments.some((segment) => expandCronSegment(segment, min, max).has(value));
};

class UserPreferencesService {

    /**
     * Get or lazily create preferences for a user.
     */
    static async getOrCreateUserPreferences(userId: string) {
        try {
            console.log('Service: UserPreferencesService.getOrCreateUserPreferences called'.cyan.italic, {userId});

            let preferences = await UserPreferenceModel.findOne({userId});
            if (!preferences) {
                preferences = await UserPreferenceModel.create({
                    userId,
                    notificationSchedule: DEFAULT_NOTIFICATION_SCHEDULE,
                    timezone: DEFAULT_TIMEZONE,
                    maxJobsInEmail: DEFAULT_MAX_JOBS_IN_EMAIL,
                    maxNewsInEmail: DEFAULT_MAX_NEWS_IN_EMAIL,
                    maxTimeDateItemsInEmail: DEFAULT_MAX_TIME_DATE_ITEMS_IN_EMAIL,
                });
                console.log('SUCCESS: User preferences created'.bgGreen.bold, {userId});
            }

            return {preferences};
        } catch (error: any) {
            console.error('Service Error: UserPreferencesService.getOrCreateUserPreferences failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Get preferences for a user, creating defaults when needed.
     */
    static async getUserPreferences(userId: string) {
        try {
            console.log('Service: UserPreferencesService.getUserPreferences called'.cyan.italic, {userId});
            return this.getOrCreateUserPreferences(userId);
        } catch (error: any) {
            console.error('Service Error: UserPreferencesService.getUserPreferences failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Update preferences with validation and normalization.
     */
    static async updateUserPreferences(userId: string, params: Partial<IUpdatePreferencesParams>) {
        try {
            console.log('Service: UserPreferencesService.updateUserPreferences called'.cyan.italic, {userId, params});

            const {preferences} = await this.getOrCreateUserPreferences(userId);

            if (params.contentFilters !== undefined) {
                const invalidFilters = params.contentFilters.filter((filter) => !CONTENT_FILTERS.includes(filter));
                if (invalidFilters.length > 0) {
                    console.warn('Client Error: Invalid content filters supplied'.yellow, {userId, invalidFilters});
                    return {error: generateInvalidCode('content_filters')};
                }

                preferences.contentFilters = Array.from(new Set(params.contentFilters));
            }

            if (params.deliveryMode !== undefined) {
                if (!DELIVERY_MODES.includes(params.deliveryMode)) {
                    console.warn('Client Error: Invalid delivery mode supplied'.yellow, {userId, deliveryMode: params.deliveryMode});
                    return {error: generateInvalidCode('delivery_mode')};
                }

                preferences.deliveryMode = params.deliveryMode;
                preferences.emailDigestEnabled = params.deliveryMode !== 'dashboard_only';
                preferences.aiSummaryEnabled = params.deliveryMode === 'smart_summary';
            }

            if (params.keywords !== undefined) {
                preferences.keywords = normalizeStringArray(params.keywords);
            }

            if (params.companies !== undefined) {
                preferences.companies = normalizeStringArray(params.companies);
            }

            if (params.jobTitles !== undefined) {
                preferences.jobTitles = normalizeStringArray(params.jobTitles);
            }

            if (params.locations !== undefined) {
                preferences.locations = normalizeStringArray(params.locations);
            }

            if (params.notificationSchedule !== undefined) {
                const normalizedSchedule = params.notificationSchedule.trim();
                preferences.notificationSchedule = normalizedSchedule || DEFAULT_NOTIFICATION_SCHEDULE;
            }

            if (params.timezone !== undefined) {
                preferences.timezone = params.timezone.trim() || DEFAULT_TIMEZONE;
            }

            if (params.maxJobsInEmail !== undefined) {
                preferences.maxJobsInEmail = normalizeEmailItemCount(params.maxJobsInEmail, DEFAULT_MAX_JOBS_IN_EMAIL);
            }

            if (params.maxNewsInEmail !== undefined) {
                preferences.maxNewsInEmail = normalizeEmailItemCount(params.maxNewsInEmail, DEFAULT_MAX_NEWS_IN_EMAIL);
            }

            if (params.maxTimeDateItemsInEmail !== undefined) {
                preferences.maxTimeDateItemsInEmail = normalizeEmailItemCount(params.maxTimeDateItemsInEmail, DEFAULT_MAX_TIME_DATE_ITEMS_IN_EMAIL);
            }

            await preferences.save();

            console.log('SUCCESS: User preferences updated'.bgGreen.bold, {userId});
            return {preferences};
        } catch (error: any) {
            console.error('Service Error: UserPreferencesService.updateUserPreferences failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Reset preferences to product defaults.
     */
    static async resetUserPreferences(userId: string) {
        try {
            console.log('Service: UserPreferencesService.resetUserPreferences called'.cyan.italic, {userId});

            const {preferences} = await this.getOrCreateUserPreferences(userId);
            preferences.contentFilters = ['job_updates'];
            preferences.deliveryMode = 'smart_summary';
            preferences.keywords = [];
            preferences.companies = [];
            preferences.jobTitles = [];
            preferences.locations = [];
            preferences.notificationSchedule = DEFAULT_NOTIFICATION_SCHEDULE;
            preferences.timezone = DEFAULT_TIMEZONE;
            preferences.maxJobsInEmail = DEFAULT_MAX_JOBS_IN_EMAIL;
            preferences.maxNewsInEmail = DEFAULT_MAX_NEWS_IN_EMAIL;
            preferences.maxTimeDateItemsInEmail = DEFAULT_MAX_TIME_DATE_ITEMS_IN_EMAIL;
            preferences.emailDigestEnabled = true;
            preferences.aiSummaryEnabled = true;
            await preferences.save();

            console.log('SUCCESS: User preferences reset'.bgGreen.bold, {userId});
            return {preferences};
        } catch (error: any) {
            console.error('Service Error: UserPreferencesService.resetUserPreferences failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Check whether a filter is enabled.
     */
    static includesFilter(preferences: IUserPreference | null | undefined, filter: TContentFilter) {
        return Boolean(preferences?.contentFilters?.includes(filter));
    }

    /**
     * Build a compact, de-duplicated search term list for jobs and news.
     */
    static buildSearchTerms(preferences: IUserPreference | null | undefined) {
        if (!preferences) {
            return [];
        }

        return Array.from(new Set([
            ...normalizeStringArray(preferences.keywords),
            ...normalizeStringArray(preferences.companies),
            ...normalizeStringArray(preferences.jobTitles),
            ...normalizeStringArray(preferences.locations),
        ]));
    }

    /**
     * Decide whether a digest should be sent for the current cron tick.
     */
    static shouldDeliverOnSchedule(preferences: IUserPreference | null | undefined, date: Date = new Date()) {
        if (!preferences) {
            return true;
        }

        if (!preferences.emailDigestEnabled || preferences.deliveryMode === 'dashboard_only') {
            return false;
        }

        const schedule = preferences.notificationSchedule?.trim() || DEFAULT_NOTIFICATION_SCHEDULE;
        const segments = schedule.split(/\s+/);
        if (segments.length !== 5) {
            return true;
        }

        try {
            const timezone = preferences.timezone || DEFAULT_TIMEZONE;
            const parts = getDatePartsForTimezone(date, timezone);

            return matchesCronField(segments[0], parts.minute, 0, 59)
                && matchesCronField(segments[1], parts.hour, 0, 23)
                && matchesCronField(segments[2], parts.day, 1, 31)
                && matchesCronField(segments[3], parts.month, 1, 12)
                && matchesCronField(segments[4], parts.weekday, 0, 6);
        } catch (error: any) {
            console.warn('Service Warning: Failed to evaluate user notification schedule, falling back to send'.yellow, {
                schedule,
                message: error.message,
            });
            return true;
        }
    }

    /**
     * Match a job payload against saved preference rules.
     */
    static matchesJobPreferences(preferences: IUserPreference | null | undefined, payload: TJobPreferenceMatchInput) {
        if (!preferences) {
            return true;
        }

        const searchableText = [
            payload.title,
            payload.company,
            payload.location,
            payload.description,
            ...(payload.tags || []),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const keywords = normalizeStringArray(preferences.keywords);
        const companies = normalizeStringArray(preferences.companies);
        const jobTitles = normalizeStringArray(preferences.jobTitles);
        const locations = normalizeStringArray(preferences.locations);

        return includesAny(searchableText, keywords)
            && includesAny(searchableText, companies)
            && includesAny(searchableText, jobTitles)
            && includesAny(searchableText, locations);
    }

    /**
     * Match a news payload against saved preference rules.
     */
    static matchesNewsPreferences(preferences: IUserPreference | null | undefined, payload: TNewsPreferenceMatchInput) {
        if (!preferences) {
            return true;
        }

        const searchableText = [
            payload.title,
            payload.source,
            payload.description,
            payload.category,
            ...(payload.tags || []),
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const keywords = normalizeStringArray(preferences.keywords);
        const companies = normalizeStringArray(preferences.companies);
        const jobTitles = normalizeStringArray(preferences.jobTitles);

        return includesAny(searchableText, keywords)
            && includesAny(searchableText, companies)
            && includesAny(searchableText, jobTitles);
    }

    /**
     * Create a readable time context for digests.
     */
    static formatTimeContext(timezone?: string) {
        const resolvedTimezone = timezone || DEFAULT_TIMEZONE;

        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: resolvedTimezone,
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            }).format(new Date());
        } catch (error) {
            return new Date().toISOString();
        }
    }
}

export default UserPreferencesService;
