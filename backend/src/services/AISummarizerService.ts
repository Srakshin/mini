import "colors";
import {GoogleGenerativeAI} from "@google/generative-ai";
import {GEMINI_API_KEY} from "../config/config";

type TDigestJob = {
    title: string;
    company: string;
    location?: string;
    source?: string;
    postedAt?: Date;
    aiSummary?: string;
};

type TDigestNews = {
    title: string;
    source: string;
    description?: string;
    publishedAt?: Date;
    aiSummary?: string;
};

type TTimeDateItem = {
    subject: string;
    from: string;
    snippet: string;
    receivedAt?: Date;
};

const DEFAULT_MODEL = 'gemini-1.5-flash';

const formatDate = (value?: Date) => {
    return value ? new Date(value).toISOString() : 'Unknown date';
};

class AISummarizerService {

    /**
     * Resolve the Gemini model only when the API key is configured.
     */
    private static getModel() {
        if (!GEMINI_API_KEY) {
            return null;
        }

        const client = new GoogleGenerativeAI(GEMINI_API_KEY);
        return client.getGenerativeModel({model: DEFAULT_MODEL});
    }

    /**
     * Safely generate structured summary text with a deterministic fallback.
     */
    private static async generateContent(prompt: string, fallback: string) {
        try {
            const model = this.getModel();
            if (!model) {
                console.warn('Config Warning: GEMINI_API_KEY missing, using deterministic fallback summary'.yellow.italic);
                return fallback;
            }

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();

            if (!text) {
                console.warn('Service Warning: Gemini returned an empty summary, using fallback'.yellow);
                return fallback;
            }

            return text;
        } catch (error: any) {
            console.error('Service Error: AISummarizerService.generateContent failed'.red.bold, error.message);
            return fallback;
        }
    }

    /**
     * Summarize a single job item.
     */
    static async summarizeJobAlert(job: {
        title: string;
        company: string;
        location?: string;
        description?: string;
        source?: string;
    }) {
        console.log('Service: AISummarizerService.summarizeJobAlert called'.cyan.italic, {
            title: job.title,
            company: job.company,
        });

        const fallback = [
            `${job.title} at ${job.company}`,
            job.location ? `Location: ${job.location}` : null,
            job.source ? `Source: ${job.source}` : null,
            job.description ? job.description.slice(0, 220) : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const prompt = [
            'You are PulseJobMail AI.',
            'Write a concise job summary in at most two sentences.',
            'Prioritize role, company, location, and why the listing is relevant.',
            `Title: ${job.title}`,
            `Company: ${job.company}`,
            `Location: ${job.location || 'Unknown'}`,
            `Source: ${job.source || 'Unknown'}`,
            `Description: ${job.description || 'N/A'}`,
        ].join('\n');

        return this.generateContent(prompt, fallback);
    }

    /**
     * Summarize a single news article.
     */
    static async summarizeNewsArticle(article: {
        title: string;
        source: string;
        description?: string;
        category?: string;
    }) {
        console.log('Service: AISummarizerService.summarizeNewsArticle called'.cyan.italic, {
            title: article.title,
            source: article.source,
        });

        const fallback = [
            `${article.title} (${article.source})`,
            article.category ? `Category: ${article.category}` : null,
            article.description ? article.description.slice(0, 220) : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const prompt = [
            'You are PulseJobMail AI.',
            'Summarize this article for someone tracking hiring, careers, and technology changes.',
            'Keep the summary factual, practical, and under two sentences.',
            `Title: ${article.title}`,
            `Source: ${article.source}`,
            `Category: ${article.category || 'General'}`,
            `Description: ${article.description || 'N/A'}`,
        ].join('\n');

        return this.generateContent(prompt, fallback);
    }

    /**
     * Build a unified smart digest similar to PulsePress.
     */
    static async buildDigestSummary(params: {
        userEmail: string;
        timezone: string;
        jobs: TDigestJob[];
        news: TDigestNews[];
        timeDateItems: TTimeDateItem[];
    }) {
        console.log('Service: AISummarizerService.buildDigestSummary called'.cyan.italic, {
            userEmail: params.userEmail,
            jobs: params.jobs.length,
            news: params.news.length,
            timeDateItems: params.timeDateItems.length,
        });

        const fallback = [
            `PulseJobMail digest for ${params.userEmail}`,
            params.jobs.length ? `Jobs: ${params.jobs.length} fresh opportunities detected.` : 'Jobs: no fresh opportunities detected.',
            params.news.length ? `News: ${params.news.length} relevant stories captured.` : 'News: no major stories captured.',
            params.timeDateItems.length ? `Time & Date: ${params.timeDateItems.length} scheduling items need attention.` : 'Time & Date: no scheduling items detected.',
        ].join('\n');

        const jobLines = params.jobs.slice(0, 8).map((job, index) => {
            return `${index + 1}. ${job.title} | ${job.company} | ${job.location || 'Unknown'} | ${formatDate(job.postedAt)}`;
        });
        const newsLines = params.news.slice(0, 8).map((article, index) => {
            return `${index + 1}. ${article.title} | ${article.source} | ${formatDate(article.publishedAt)}`;
        });
        const timeDateLines = params.timeDateItems.slice(0, 6).map((item, index) => {
            return `${index + 1}. ${item.subject} | ${item.from} | ${formatDate(item.receivedAt)}`;
        });

        const prompt = [
            'You are PulseJobMail AI creating a smart summary like PulsePress.',
            'Write a clear digest using these exact section headings: Highlights, Jobs, News, Time & Date, Next Actions.',
            'Use short practical bullet-style sentences and do not invent details.',
            `Recipient: ${params.userEmail}`,
            `Timezone: ${params.timezone}`,
            `Jobs (${params.jobs.length}):`,
            jobLines.length ? jobLines.join('\n') : 'None',
            `News (${params.news.length}):`,
            newsLines.length ? newsLines.join('\n') : 'None',
            `Time & Date (${params.timeDateItems.length}):`,
            timeDateLines.length ? timeDateLines.join('\n') : 'None',
        ].join('\n');

        return this.generateContent(prompt, fallback);
    }
}

export default AISummarizerService;
