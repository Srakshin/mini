import "colors";
import cron from "node-cron";
import {JOB_CRAWL_CRON} from "../config/config";
import UserPreferenceModel from "../models/UserPreferenceSchema";
import EmailForwardService from "../services/EmailForwardService";
import GmailFetchService from "../services/GmailFetchService";
import JobParserService from "../services/JobParserService";
import NewsAggregatorService from "../services/NewsAggregatorService";
import {crawlJobsForPreferences} from "./jobCrawlers";

type TDeliveryPayload = {
    jobs: any[];
    news: any[];
    timeDateItems: any[];
};

let isCronRunning = false;

const mergeDeliveryPayload = (accumulator: Map<string, TDeliveryPayload>, userId: string) => {
    const existing = accumulator.get(userId) || {jobs: [], news: [], timeDateItems: []};
    accumulator.set(userId, existing);
    return existing;
};

const dedupeByKey = <T>(items: T[], resolver: (item: T) => string) => {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = resolver(item);
        if (!key || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

export const runEmailSyncCycle = async () => {
    console.log('Cron: runEmailSyncCycle started'.cyan.italic);
    return GmailFetchService.syncAllConnectedAccounts();
};

export const runJobCrawlCycle = async () => {
    console.log('Cron: runJobCrawlCycle started'.cyan.italic);

    const preferences = await UserPreferenceModel.find({});
    const results: Array<{userId: string; jobs: any[]}> = [];

    for (const preference of preferences) {
        if (!preference.contentFilters.includes('job_updates')) {
            continue;
        }

        const userId = String(preference.userId);
        const crawledJobs = await crawlJobsForPreferences(preference);
        const {jobs} = await JobParserService.upsertCrawledJobs(userId, crawledJobs);
        results.push({userId, jobs});
    }

    console.log('SUCCESS: Job crawl cycle completed'.bgGreen.bold, {users: results.length});
    return {results};
};

export const runNewsPullCycle = async () => {
    console.log('Cron: runNewsPullCycle started'.cyan.italic);
    const {articles} = await NewsAggregatorService.syncNewsForAllUsers();
    await NewsAggregatorService.syncNewsForUserTopics();
    console.log('SUCCESS: News pull cycle completed'.bgGreen.bold, {articles: articles.length});
    return {articles};
};

export const runPulseJobMailCron = async () => {
    if (isCronRunning) {
        console.warn('Cron Warning: Previous PulseJobMail cycle is still running, skipping this tick'.yellow);
        return;
    }

    isCronRunning = true;
    console.info('Cron: PulseJobMail aggregation cycle started'.bgBlue.white.bold);

    try {
        const deliveryMap = new Map<string, TDeliveryPayload>();

        const gmailSync = await runEmailSyncCycle();
        gmailSync.results.forEach((result) => {
            const delivery = mergeDeliveryPayload(deliveryMap, result.userId);
            delivery.jobs.push(...result.jobs);
            delivery.news.push(...result.newsItems.map((item) => ({
                title: item.subject,
                source: item.from,
                description: item.snippet,
                publishedAt: item.receivedAt,
                aiSummary: item.snippet,
            })));
            delivery.timeDateItems.push(...result.timeDateItems);
        });

        const jobResults = await runJobCrawlCycle();
        jobResults.results.forEach((result) => {
            const delivery = mergeDeliveryPayload(deliveryMap, result.userId);
            delivery.jobs.push(...result.jobs);
        });

        const {articles} = await runNewsPullCycle();
        const preferences = await UserPreferenceModel.find({});
        for (const preference of preferences) {
            const userId = String(preference.userId);
            const delivery = mergeDeliveryPayload(deliveryMap, userId);

            if (preference.contentFilters.includes('news')) {
                const filteredNews = await NewsAggregatorService.filterArticlesForUser(userId, articles);
                delivery.news.push(...filteredNews.map((article) => ({
                    title: article.title,
                    source: article.source,
                    description: article.aiSummary || article.description,
                    url: article.url,
                    publishedAt: article.publishedAt,
                    aiSummary: article.aiSummary,
                })));
            }
        }

        for (const [userId, payload] of deliveryMap.entries()) {
            payload.jobs = dedupeByKey(payload.jobs, (job) => `${job.url || ''}|${job.title || ''}|${job.company || ''}`);
            payload.news = dedupeByKey(payload.news, (article) => `${article.url || ''}|${article.title || ''}|${article.source || ''}`);
            payload.timeDateItems = dedupeByKey(payload.timeDateItems, (item) => `${item.messageId || ''}|${item.subject || ''}|${item.from || ''}`);

            await EmailForwardService.deliverDigest({
                userId,
                jobs: payload.jobs,
                news: payload.news,
                timeDateItems: payload.timeDateItems,
            });
        }

        console.log('SUCCESS: PulseJobMail aggregation cycle completed'.bgGreen.bold, {
            users: deliveryMap.size,
        });
    } catch (error: any) {
        console.error('Cron Error: PulseJobMail aggregation cycle failed'.red.bold, error);
    } finally {
        isCronRunning = false;
    }
};

export const startCronJobs = () => {
    const schedule = JOB_CRAWL_CRON && cron.validate(JOB_CRAWL_CRON)
        ? JOB_CRAWL_CRON
        : '*/15 * * * *';

    console.info('Cron: startCronJobs registered'.bgBlue.white.bold, {schedule});
    cron.schedule(schedule, async () => {
        await runPulseJobMailCron();
    });
};
