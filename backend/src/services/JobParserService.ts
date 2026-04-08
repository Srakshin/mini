import "colors";
import * as cheerio from "cheerio";
import {Types} from "mongoose";
import JobAlertModel, {IJobAlert} from "../models/JobAlertSchema";
import GmailAccountModel from "../models/GmailAccountSchema";
import {TContentFilter} from "../types/auth";
import AISummarizerService from "./AISummarizerService";
import UserPreferencesService from "./UserPreferencesService";

export type TParsedGmailMessage = {
    messageId: string;
    threadId?: string;
    gmailAccountId: string;
    gmailAccountEmail: string;
    from: string;
    senderEmail?: string;
    subject: string;
    snippet: string;
    body: string;
    htmlBody?: string;
    receivedAt?: Date;
    labelIds?: string[];
};

export type TCrawledJobListing = {
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
    salary?: string;
    jobType?: string;
    postedAt?: Date;
    tags?: string[];
    sourceLabel?: string;
};

export type TParseAndStoreGmailJobResult =
    | {skipped: true}
    | {jobAlert: IJobAlert; jobAlerts: IJobAlert[]};

const JOB_KEYWORDS = [
    'job',
    'career',
    'hiring',
    'opportunity',
    'application',
    'recruiter',
    'position',
    'interview',
    'role',
    'easy apply',
    'talent',
];

const NEWS_KEYWORDS = [
    'newsletter',
    'daily briefing',
    'tech news',
    'market update',
    'headlines',
    'digest',
    'industry news',
    'funding round',
    'layoffs',
];

const TIME_DATE_KEYWORDS = [
    'schedule',
    'calendar',
    'availability',
    'meeting',
    'interview',
    'tomorrow',
    'today',
    'time',
    'date',
    'reschedule',
    'zoom',
    'google meet',
    'slot',
];

const JOB_SENDER_HINTS = [
    'linkedin.com',
    'indeed.com',
    'glassdoor.com',
    'greenhouse.io',
    'lever.co',
    'ashbyhq.com',
    'smartrecruiters.com',
    'myworkday.com',
];

const cleanText = (value?: string | null) => {
    return (value || '').replace(/\s+/g, ' ').trim();
};

const extractSenderEmail = (from: string) => {
    const angleMatch = from.match(/<([^>]+)>/);
    if (angleMatch?.[1]) {
        return angleMatch[1].trim().toLowerCase();
    }

    const directMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return directMatch?.[0]?.toLowerCase();
};

const extractFirstMatch = (value: string, regex: RegExp) => {
    const match = value.match(regex);
    return match?.[1] ? cleanText(match[1]) : undefined;
};

const extractFirstUrl = (value: string) => {
    const match = value.match(/https?:\/\/[^\s<>"')]+/i);
    return match?.[0];
};

const inferCompanyFromEmail = (from: string) => {
    const senderEmail = extractSenderEmail(from) || from;
    const domainMatch = senderEmail.match(/@([A-Za-z0-9.-]+)/);
    if (!domainMatch?.[1]) {
        return undefined;
    }

    const domain = domainMatch[1]
        .replace(/\.(com|io|ai|co|org|net)$/i, '')
        .split('.')
        .pop();

    if (!domain) {
        return undefined;
    }

    return domain.charAt(0).toUpperCase() + domain.slice(1);
};

const normalizeJob = (job: Partial<TCrawledJobListing>, fallback: {
    title: string;
    company: string;
    description?: string;
    sourceLabel: string;
    postedAt?: Date;
}) => {
    return {
        title: cleanText(job.title) || fallback.title,
        company: cleanText(job.company) || fallback.company,
        location: cleanText(job.location),
        description: cleanText(job.description) || cleanText(fallback.description),
        url: cleanText(job.url),
        salary: cleanText(job.salary),
        jobType: cleanText(job.jobType),
        postedAt: job.postedAt || fallback.postedAt,
        sourceLabel: cleanText(job.sourceLabel) || fallback.sourceLabel,
        tags: Array.from(new Set((job.tags || []).map((tag) => cleanText(tag).toLowerCase()).filter(Boolean))),
    } as TCrawledJobListing;
};

const extractJobsFromProviderHtml = (message: TParsedGmailMessage) => {
    if (!message.htmlBody) {
        return [] as TCrawledJobListing[];
    }

    const $ = cheerio.load(message.htmlBody);
    const senderEmail = message.senderEmail || extractSenderEmail(message.from) || '';
    const seen = new Set<string>();
    const jobs: TCrawledJobListing[] = [];

    const registerJob = (job: Partial<TCrawledJobListing>) => {
        const normalized = normalizeJob(job, {
            title: cleanText(message.subject) || 'New Job Opportunity',
            company: inferCompanyFromEmail(message.from) || 'Unknown Company',
            description: message.snippet || message.body,
            sourceLabel: 'gmail',
            postedAt: message.receivedAt,
        });

        const dedupeKey = `${normalized.title.toLowerCase()}|${normalized.company.toLowerCase()}|${normalized.url || ''}`;
        if (!normalized.title || !normalized.company || seen.has(dedupeKey)) {
            return;
        }

        seen.add(dedupeKey);
        jobs.push(normalized);
    };

    if (senderEmail.includes('linkedin.com')) {
        $('a[href*="linkedin.com/comm/jobs/view"], a[href*="linkedin.com/jobs/view"]').each((_, element) => {
            const root = $(element);
            const href = cleanText(root.attr('href'));
            const paragraphs = root.find('p').toArray().map((node) => cleanText($(node).text())).filter(Boolean);
            const title = cleanText(root.text()) || paragraphs[0];
            const companyLocation = paragraphs.find((line) => /[|\u00b7\u2022]/.test(line));
            const company = companyLocation?.split(/[|\u00b7\u2022]/)[0]?.trim() || inferCompanyFromEmail(message.from);
            const location = companyLocation?.split(/[|\u00b7\u2022]/)[1]?.trim();

            registerJob({
                title,
                company,
                location,
                url: href,
                description: `LinkedIn email alert: ${message.snippet || message.subject}`,
                sourceLabel: 'gmail-linkedin',
                tags: ['gmail', 'linkedin'],
            });
        });
    }

    if (senderEmail.includes('indeed.com')) {
        $('a[href*="indeed.com/viewjob"], a[href*="indeed.com/rc/clk"], a[href*="indeed.com/job"]').each((_, element) => {
            const root = $(element);
            const href = cleanText(root.attr('href'));
            const textBlocks = root.find('td, div, span, p, strong, b, h2, h3')
                .toArray()
                .map((node) => cleanText($(node).text()))
                .filter(Boolean);

            registerJob({
                title: textBlocks[0] || cleanText(root.text()),
                company: textBlocks[1] || inferCompanyFromEmail(message.from),
                location: textBlocks.find((block) => block.toLowerCase().includes('remote') || /,\s*[A-Z]{2}$/i.test(block)),
                salary: textBlocks.find((block) => /\$|usd|eur|gbp|salary/i.test(block)),
                url: href,
                description: `Indeed email alert: ${message.snippet || message.subject}`,
                sourceLabel: 'gmail-indeed',
                tags: ['gmail', 'indeed'],
            });
        });
    }

    if (senderEmail.includes('glassdoor.com')) {
        $('a[href*="glassdoor.com/job-listing"], a[href*="glassdoor.com/partner/jobListing"], a[href*="glassdoor.com/Job"]').each((_, element) => {
            const root = $(element);
            const href = cleanText(root.attr('href'));
            const textBlocks = root.find('p, div, span, strong, b').toArray().map((node) => cleanText($(node).text())).filter(Boolean);

            registerJob({
                title: textBlocks[0] || cleanText(root.text()),
                company: textBlocks[1] || inferCompanyFromEmail(message.from),
                location: textBlocks.find((block) => block.toLowerCase().includes('remote') || /,\s*[A-Z]{2}$/i.test(block)),
                salary: textBlocks.find((block) => /\$|usd|eur|gbp|salary/i.test(block)),
                url: href,
                description: `Glassdoor email alert: ${message.snippet || message.subject}`,
                sourceLabel: 'gmail-glassdoor',
                tags: ['gmail', 'glassdoor'],
            });
        });
    }

    if (!jobs.length) {
        $('a[href]').each((_, element) => {
            const root = $(element);
            const href = cleanText(root.attr('href'));
            const anchorText = cleanText(root.text());

            if (!href || !anchorText) {
                return;
            }

            if (!/job|career|apply|opening|position|role/i.test(`${href} ${anchorText}`)) {
                return;
            }

            registerJob({
                title: anchorText,
                company: inferCompanyFromEmail(message.from),
                url: href,
                description: cleanText(message.snippet || message.body),
                sourceLabel: 'gmail-generic',
                tags: ['gmail'],
            });
        });
    }

    return jobs.slice(0, 5);
};

class JobParserService {

    /**
     * Classify an email into the configured PulseJobMail filters.
     */
    static classifyMessage(payload: Pick<TParsedGmailMessage, 'subject' | 'from' | 'snippet' | 'body' | 'senderEmail'>): TContentFilter | 'other' {
        const searchableText = [
            payload.subject,
            payload.from,
            payload.senderEmail,
            payload.snippet,
            payload.body,
        ].join(' ').toLowerCase();

        const jobScore = JOB_KEYWORDS.filter((keyword) => searchableText.includes(keyword)).length
            + (JOB_SENDER_HINTS.some((keyword) => searchableText.includes(keyword)) ? 3 : 0);
        const newsScore = NEWS_KEYWORDS.filter((keyword) => searchableText.includes(keyword)).length;
        const timeDateScore = TIME_DATE_KEYWORDS.filter((keyword) => searchableText.includes(keyword)).length;

        if (jobScore >= newsScore && jobScore >= timeDateScore && jobScore > 0) {
            return 'job_updates';
        }

        if (newsScore >= timeDateScore && newsScore > 0) {
            return 'news';
        }

        if (timeDateScore > 0) {
            return 'time_date';
        }

        return 'other';
    }

    /**
     * Parse Gmail job content and upsert a JobAlert document.
     */
    static async parseAndStoreGmailJob(userId: string, message: TParsedGmailMessage): Promise<TParseAndStoreGmailJobResult> {
        try {
            console.log('Service: JobParserService.parseAndStoreGmailJob called'.cyan.italic, {
                userId,
                gmailAccountId: message.gmailAccountId,
                messageId: message.messageId,
            });

            const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(userId);
            const parsedJobs = this.extractJobsFromMessage(message);
            const bestJob = parsedJobs[0];

            if (!bestJob) {
                console.warn('Service Warning: No structured job could be parsed from Gmail message'.yellow, {
                    userId,
                    messageId: message.messageId,
                });
                return {skipped: true};
            }

            if (!UserPreferencesService.matchesJobPreferences(preferences, bestJob)) {
                console.warn('Service Warning: Gmail job skipped due to user filters'.yellow, {
                    userId,
                    messageId: message.messageId,
                });
                return {skipped: true};
            }

            const gmailAccount = await GmailAccountModel.findById(message.gmailAccountId);
            let jobAlert = await JobAlertModel.findOne({
                userId,
                gmailMessageId: message.messageId,
            });

            if (!jobAlert) {
                jobAlert = new JobAlertModel({
                    userId: new Types.ObjectId(userId),
                    gmailAccountId: gmailAccount?._id,
                    source: 'gmail',
                    status: 'new',
                    gmailMessageId: message.messageId,
                });
            }

            jobAlert.title = bestJob.title;
            jobAlert.company = bestJob.company;
            jobAlert.location = bestJob.location;
            jobAlert.description = bestJob.description;
            jobAlert.url = bestJob.url;
            jobAlert.salary = bestJob.salary;
            jobAlert.jobType = bestJob.jobType;
            jobAlert.postedAt = bestJob.postedAt || message.receivedAt;
            jobAlert.emailSubject = message.subject;
            jobAlert.emailFrom = message.from;
            jobAlert.emailReceivedAt = message.receivedAt;
            jobAlert.tags = bestJob.tags || [];
            jobAlert.rawContent = cleanText(message.body || message.htmlBody);

            if (preferences.aiSummaryEnabled) {
                jobAlert.aiSummary = await AISummarizerService.summarizeJobAlert({
                    title: jobAlert.title,
                    company: jobAlert.company,
                    location: jobAlert.location,
                    description: jobAlert.description,
                    source: 'gmail',
                });
            }

            await jobAlert.save();

            console.log('SUCCESS: Gmail job parsed and stored'.bgGreen.bold, {
                userId,
                jobAlertId: jobAlert._id,
            });
            return {jobAlert, jobAlerts: [jobAlert]};
        } catch (error: any) {
            console.error('Service Error: JobParserService.parseAndStoreGmailJob failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Persist crawled jobs for a user, respecting preference filters and deduplication.
     */
    static async upsertCrawledJobs(userId: string, crawledJobs: TCrawledJobListing[]) {
        try {
            console.log('Service: JobParserService.upsertCrawledJobs called'.cyan.italic, {
                userId,
                count: crawledJobs.length,
            });

            const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(userId);
            const storedJobs: IJobAlert[] = [];

            for (const crawledJob of crawledJobs) {
                if (!UserPreferencesService.matchesJobPreferences(preferences, crawledJob)) {
                    continue;
                }

                const existingQuery = crawledJob.url
                    ? {userId, url: crawledJob.url}
                    : {
                        userId,
                        source: 'crawled',
                        title: crawledJob.title,
                        company: crawledJob.company,
                        location: crawledJob.location,
                    };

                const existing = await JobAlertModel.findOne(existingQuery);
                if (existing) {
                    continue;
                }

                const jobAlert = new JobAlertModel({
                    userId: new Types.ObjectId(userId),
                    source: 'crawled',
                    status: 'new',
                    title: crawledJob.title,
                    company: crawledJob.company,
                    location: crawledJob.location,
                    description: cleanText(crawledJob.description),
                    url: crawledJob.url,
                    salary: crawledJob.salary,
                    jobType: crawledJob.jobType,
                    postedAt: crawledJob.postedAt,
                    tags: crawledJob.tags || [],
                });

                if (preferences.aiSummaryEnabled) {
                    jobAlert.aiSummary = await AISummarizerService.summarizeJobAlert({
                        title: crawledJob.title,
                        company: crawledJob.company,
                        location: crawledJob.location,
                        description: crawledJob.description,
                        source: crawledJob.sourceLabel || 'crawled',
                    });
                }

                await jobAlert.save();
                storedJobs.push(jobAlert);
            }

            console.log('SUCCESS: Crawled jobs upserted'.bgGreen.bold, {
                userId,
                stored: storedJobs.length,
            });
            return {jobs: storedJobs};
        } catch (error: any) {
            console.error('Service Error: JobParserService.upsertCrawledJobs failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Extract the most relevant jobs from a Gmail message.
     */
    static extractJobsFromMessage(message: TParsedGmailMessage) {
        const providerJobs = extractJobsFromProviderHtml(message);
        if (providerJobs.length) {
            return providerJobs;
        }

        return [this.parseJobContent({
            titleSource: message.subject,
            body: message.body,
            fallbackCompany: inferCompanyFromEmail(message.from),
            sourceLabel: 'gmail',
            receivedAt: message.receivedAt,
        })]
            .filter((job) => Boolean(job.title && job.company));
    }

    /**
     * Heuristic parser for job-like message and crawler content.
     */
    static parseJobContent(params: {
        titleSource: string;
        body: string;
        fallbackCompany?: string;
        sourceLabel: string;
        receivedAt?: Date;
    }) {
        const normalizedBody = cleanText(params.body);
        const titleFromSubject = extractFirstMatch(params.titleSource, /(?:job|role|position|opening)[:\-\s]+(.+)/i)
            || extractFirstMatch(params.titleSource, /application for\s+(.+)/i)
            || extractFirstMatch(params.titleSource, /(.+?)\s+at\s+([A-Za-z0-9& .-]+)/i)
            || cleanText(params.titleSource);

        const companyFromSubject = extractFirstMatch(params.titleSource, /.+?\s+at\s+([A-Za-z0-9& .-]+)/i);
        const companyFromBody = extractFirstMatch(normalizedBody, /company[:\-\s]+([A-Za-z0-9& .-]+)/i)
            || extractFirstMatch(normalizedBody, /team at\s+([A-Za-z0-9& .-]+)/i);
        const location = extractFirstMatch(normalizedBody, /location[:\-\s]+([A-Za-z0-9, /()-]+)/i)
            || extractFirstMatch(normalizedBody, /based in\s+([A-Za-z0-9, /()-]+)/i)
            || extractFirstMatch(normalizedBody, /(remote|hybrid|onsite)/i);
        const salary = extractFirstMatch(normalizedBody, /(salary[:\-\s]+\$?[A-Za-z0-9,.\-+/ ]+)/i)
            || extractFirstMatch(normalizedBody, /(\$[0-9kK,.\- ]+\s*(?:per year|\/year|\/hr|annually)?)/i);
        const jobType = extractFirstMatch(normalizedBody, /employment type[:\-\s]+([A-Za-z /-]+)/i)
            || extractFirstMatch(normalizedBody, /(full-time|part-time|contract|internship|remote|hybrid|onsite)/i);
        const url = extractFirstUrl(normalizedBody);
        const tags = Array.from(new Set([
            params.sourceLabel,
            jobType?.toLowerCase(),
            location?.toLowerCase().includes('remote') ? 'remote' : undefined,
        ].filter(Boolean) as string[]));

        return {
            title: titleFromSubject || 'New Job Opportunity',
            company: companyFromSubject || companyFromBody || params.fallbackCompany || 'Unknown Company',
            location,
            description: normalizedBody.slice(0, 2000),
            salary,
            jobType,
            url,
            postedAt: params.receivedAt,
            tags,
            sourceLabel: params.sourceLabel,
        };
    }
}

export default JobParserService;
