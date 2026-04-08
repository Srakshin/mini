import "colors";
import nodemailer from "nodemailer";
import UserModel from "../models/UserSchema";
import {EMAIL_FROM, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, EMAIL_USER} from "../config/config";
import AISummarizerService from "./AISummarizerService";
import UserPreferencesService from "./UserPreferencesService";

type TDeliveryJob = {
    title: string;
    company: string;
    location?: string;
    description?: string;
    url?: string;
    postedAt?: Date;
    aiSummary?: string;
    source?: string;
};

type TDeliveryNews = {
    title: string;
    source: string;
    description?: string;
    url?: string;
    publishedAt?: Date;
    aiSummary?: string;
};

type TDeliveryTimeDate = {
    subject: string;
    from: string;
    snippet: string;
    receivedAt?: Date;
};

const escapeHtml = (value?: string) => {
    return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const formatDate = (value?: Date) => {
    return value ? new Date(value).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'}) : 'Unknown';
};

const truncateText = (value?: string, maxLength: number = 180) => {
    const normalized = (value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    if (normalized.length <= maxLength) {
        return normalized;
    }

    return `${normalized.slice(0, maxLength - 3).trim()}...`;
};

const isTransportConfigured = () => {
    return Boolean(EMAIL_HOST && EMAIL_USER && EMAIL_PASS);
};

const createTransporter = () => {
    return nodemailer.createTransport({
        host: EMAIL_HOST || 'smtp.gmail.com',
        port: Number(EMAIL_PORT) || 587,
        secure: false,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });
};

const applyItemLimit = <T>(items: T[], limit?: number | null) => {
    if (!Number.isFinite(Number(limit)) || limit === undefined || limit === null) {
        return items;
    }

    const resolvedLimit = Math.max(0, Math.floor(Number(limit)));
    if (resolvedLimit === 0) {
        return items;
    }

    return items.slice(0, resolvedLimit);
};

class EmailForwardService {

    /**
     * Deliver a digest based on the user's selected delivery mode.
     */
    static async deliverDigest(params: {
        userId: string;
        jobs?: TDeliveryJob[];
        news?: TDeliveryNews[];
        timeDateItems?: TDeliveryTimeDate[];
        forceSend?: boolean;
    }) {
        try {
            console.log('Service: EmailForwardService.deliverDigest called'.cyan.italic, {userId: params.userId});

            const user = await UserModel.findById(params.userId);
            if (!user) {
                return {error: 'USER_NOT_FOUND'};
            }

            const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(params.userId);
            const jobs = applyItemLimit(params.jobs || [], preferences.maxJobsInEmail);
            const news = applyItemLimit(params.news || [], preferences.maxNewsInEmail);
            const timeDateItems = applyItemLimit(params.timeDateItems || [], preferences.maxTimeDateItemsInEmail);

            if (!params.forceSend && preferences.deliveryMode === 'dashboard_only') {
                console.warn('Service Warning: Digest skipped because delivery mode is dashboard_only'.yellow, {
                    userId: params.userId,
                });
                return {skipped: true, reason: 'dashboard_only'};
            }

            if (!params.forceSend && !UserPreferencesService.shouldDeliverOnSchedule(preferences)) {
                console.warn('Service Warning: Digest skipped because user schedule does not match current tick'.yellow, {
                    userId: params.userId,
                    schedule: preferences.notificationSchedule,
                });
                return {skipped: true, reason: 'outside_schedule'};
            }

            if (!jobs.length && !news.length && !timeDateItems.length) {
                return {skipped: true, reason: 'no_content'};
            }

            if (!isTransportConfigured()) {
                console.warn('Config Warning: SMTP transport not configured, digest delivery skipped'.yellow.italic, {
                    userId: params.userId,
                    email: user.email,
                });
                return {skipped: true, reason: 'email_transport_not_configured'};
            }

            const transporter = createTransporter();
            const subject = `PulseJobMail Digest | ${jobs.length} jobs, ${news.length} news, ${timeDateItems.length} schedule items`;
            const html = preferences.deliveryMode === 'full_emails'
                ? this.buildFullEmailHtml(user.email, jobs, news, timeDateItems, preferences.timezone)
                : await this.buildSmartSummaryHtml(user.email, jobs, news, timeDateItems, preferences.timezone);
            const text = this.buildPlainText(user.email, jobs, news, timeDateItems);

            await transporter.sendMail({
                from: `"PulseJobMail" <${EMAIL_FROM || EMAIL_USER}>`,
                to: user.email,
                subject,
                html,
                text,
            });

            console.log('SUCCESS: Digest delivered'.bgGreen.bold, {
                userId: params.userId,
                email: user.email,
            });
            return {sent: true};
        } catch (error: any) {
            console.error('Service Error: EmailForwardService.deliverDigest failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Send a preview digest immediately.
     */
    static async sendPreviewDigest(params: {
        userId: string;
        jobs?: TDeliveryJob[];
        news?: TDeliveryNews[];
        timeDateItems?: TDeliveryTimeDate[];
    }) {
        return this.deliverDigest({
            ...params,
            forceSend: true,
        });
    }

    /**
     * Build the "Full Emails" HTML mode.
     */
    private static buildFullEmailHtml(
        email: string,
        jobs: TDeliveryJob[],
        news: TDeliveryNews[],
        timeDateItems: TDeliveryTimeDate[],
        timezone: string,
    ) {
        const sections = [
            this.buildSection('Job Updates', jobs.map((job) => {
                return `
                    <article style="padding:16px;border:1px solid #d7deea;border-radius:12px;margin-bottom:12px;">
                        <h3 style="margin:0 0 8px 0;">${escapeHtml(job.title)}</h3>
                        <p style="margin:0 0 6px 0;"><strong>${escapeHtml(job.company)}</strong>${job.location ? ` | ${escapeHtml(job.location)}` : ''}</p>
                        <p style="margin:0 0 8px 0;color:#526071;">${escapeHtml(job.aiSummary || job.description || 'No description available')}</p>
                        <p style="margin:0;font-size:13px;color:#748094;">${escapeHtml(job.source || 'PulseJobMail')} | ${escapeHtml(formatDate(job.postedAt))}</p>
                        ${job.url ? `<p style="margin:8px 0 0 0;"><a href="${escapeHtml(job.url)}">Open job</a></p>` : ''}
                    </article>
                `;
            })),
            this.buildSection('News', news.map((article) => {
                return `
                    <article style="padding:16px;border:1px solid #d7deea;border-radius:12px;margin-bottom:12px;">
                        <h3 style="margin:0 0 8px 0;">${escapeHtml(article.title)}</h3>
                        <p style="margin:0 0 8px 0;"><strong>${escapeHtml(article.source)}</strong> | ${escapeHtml(formatDate(article.publishedAt))}</p>
                        <p style="margin:0 0 8px 0;color:#526071;">${escapeHtml(article.aiSummary || article.description || 'No summary available')}</p>
                        ${article.url ? `<p style="margin:8px 0 0 0;"><a href="${escapeHtml(article.url)}">Read article</a></p>` : ''}
                    </article>
                `;
            })),
            this.buildSection('Time & Date', timeDateItems.map((item) => {
                return `
                    <article style="padding:16px;border:1px solid #d7deea;border-radius:12px;margin-bottom:12px;">
                        <h3 style="margin:0 0 8px 0;">${escapeHtml(item.subject)}</h3>
                        <p style="margin:0 0 8px 0;"><strong>${escapeHtml(item.from)}</strong> | ${escapeHtml(formatDate(item.receivedAt))}</p>
                        <p style="margin:0;color:#526071;">${escapeHtml(item.snippet)}</p>
                    </article>
                `;
            })),
        ].join('');

        return `
            <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:32px;">
                <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;">
                    <h1 style="margin:0 0 12px 0;color:#10233f;">PulseJobMail</h1>
                    <p style="margin:0 0 24px 0;color:#526071;">Delivery mode: Full Emails | ${escapeHtml(email)} | ${escapeHtml(timezone)}</p>
                    ${sections || '<p style="color:#526071;">No new content matched this cycle.</p>'}
                </div>
            </div>
        `;
    }

    /**
     * Build the "Smart Summary" HTML mode.
     */
    private static async buildSmartSummaryHtml(
        email: string,
        jobs: TDeliveryJob[],
        news: TDeliveryNews[],
        timeDateItems: TDeliveryTimeDate[],
        timezone: string,
    ) {
        const smartSummary = await AISummarizerService.buildDigestSummary({
            userEmail: email,
            timezone,
            jobs,
            news,
            timeDateItems,
        });
        const jobCards = this.buildCompactJobCards(jobs);
        const newsCards = this.buildCompactNewsCards(news);
        const scheduleCards = this.buildCompactScheduleCards(timeDateItems);

        return `
            <div style="font-family:Arial,sans-serif;background:#eef4f9;padding:32px;">
                <div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:18px;padding:32px;">
                    <h1 style="margin:0 0 12px 0;color:#10233f;">PulseJobMail</h1>
                    <p style="margin:0 0 24px 0;color:#526071;">Delivery mode: Smart Summary | ${escapeHtml(timezone)}</p>
                    <div style="font-size:15px;line-height:1.7;color:#26374f;background:#f7fafc;padding:20px;border-radius:14px;border:1px solid #dde6f0;white-space:pre-wrap;">${escapeHtml(smartSummary)}</div>
                    <div style="margin:20px 0 0 0;color:#526071;font-size:14px;">Jobs: ${jobs.length} | News: ${news.length} | Time & Date: ${timeDateItems.length}</div>
                    ${jobCards ? `<section style="margin-top:28px;"><h2 style="margin:0 0 14px 0;color:#16325c;">Top Jobs</h2>${jobCards}</section>` : ''}
                    ${newsCards ? `<section style="margin-top:28px;"><h2 style="margin:0 0 14px 0;color:#16325c;">Top News</h2>${newsCards}</section>` : ''}
                    ${scheduleCards ? `<section style="margin-top:28px;"><h2 style="margin:0 0 14px 0;color:#16325c;">Time & Date</h2>${scheduleCards}</section>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Build plain text fallback.
     */
    private static buildPlainText(
        email: string,
        jobs: TDeliveryJob[],
        news: TDeliveryNews[],
        timeDateItems: TDeliveryTimeDate[],
    ) {
        return [
            `PulseJobMail digest for ${email}`,
            '',
            `Jobs (${jobs.length})`,
            ...jobs.map((job) => [
                `- ${job.title} | ${job.company} | ${job.location || 'Unknown location'}`,
                `  ${truncateText(job.aiSummary || job.description, 160) || 'No summary available.'}`,
                job.url ? `  Link: ${job.url}` : null,
            ].filter(Boolean).join('\n')),
            '',
            `News (${news.length})`,
            ...news.map((article) => [
                `- ${article.title} | ${article.source}`,
                `  ${truncateText(article.aiSummary || article.description, 160) || 'No summary available.'}`,
                article.url ? `  Link: ${article.url}` : null,
            ].filter(Boolean).join('\n')),
            '',
            `Time & Date (${timeDateItems.length})`,
            ...timeDateItems.map((item) => [
                `- ${item.subject} | ${item.from}`,
                `  ${truncateText(item.snippet, 140) || 'No extra details available.'}`,
            ].join('\n')),
        ].join('\n');
    }

    /**
     * Build a reusable section wrapper.
     */
    private static buildSection(title: string, items: string[]) {
        if (!items.length) {
            return '';
        }

        return `
            <section style="margin-bottom:28px;">
                <h2 style="margin:0 0 14px 0;color:#16325c;">${escapeHtml(title)}</h2>
                ${items.join('')}
            </section>
        `;
    }

    private static buildCompactJobCards(jobs: TDeliveryJob[]) {
        if (!jobs.length) {
            return '';
        }

        return jobs.map((job) => `
            <article style="padding:16px;border:1px solid #d7deea;border-radius:12px;margin-bottom:12px;background:#fbfdff;">
                <div style="font-size:18px;font-weight:700;color:#10233f;margin-bottom:6px;">${escapeHtml(job.title)}</div>
                <div style="font-size:14px;color:#526071;margin-bottom:10px;"><strong>${escapeHtml(job.company)}</strong>${job.location ? ` | ${escapeHtml(job.location)}` : ''}${job.source ? ` | ${escapeHtml(job.source)}` : ''}</div>
                <div style="font-size:14px;line-height:1.6;color:#324863;margin-bottom:10px;">${escapeHtml(truncateText(job.aiSummary || job.description, 180) || 'No summary available.')}</div>
                <div style="font-size:13px;color:#748094;">${escapeHtml(formatDate(job.postedAt))}</div>
                ${job.url ? `<div style="margin-top:10px;"><a href="${escapeHtml(job.url)}" style="color:#0b74d1;text-decoration:none;font-weight:600;">Open job</a></div>` : ''}
            </article>
        `).join('');
    }

    private static buildCompactNewsCards(news: TDeliveryNews[]) {
        if (!news.length) {
            return '';
        }

        return news.map((article) => `
            <article style="padding:16px;border:1px solid #d7deea;border-radius:12px;margin-bottom:12px;background:#fbfdff;">
                <div style="font-size:18px;font-weight:700;color:#10233f;margin-bottom:6px;">${escapeHtml(article.title)}</div>
                <div style="font-size:14px;color:#526071;margin-bottom:10px;"><strong>${escapeHtml(article.source)}</strong> | ${escapeHtml(formatDate(article.publishedAt))}</div>
                <div style="font-size:14px;line-height:1.6;color:#324863;margin-bottom:10px;">${escapeHtml(truncateText(article.aiSummary || article.description, 180) || 'No summary available.')}</div>
                ${article.url ? `<div><a href="${escapeHtml(article.url)}" style="color:#0b74d1;text-decoration:none;font-weight:600;">Read article</a></div>` : ''}
            </article>
        `).join('');
    }

    private static buildCompactScheduleCards(items: TDeliveryTimeDate[]) {
        if (!items.length) {
            return '';
        }

        return items.map((item) => `
            <article style="padding:16px;border:1px solid #d7deea;border-radius:12px;margin-bottom:12px;background:#fbfdff;">
                <div style="font-size:17px;font-weight:700;color:#10233f;margin-bottom:6px;">${escapeHtml(item.subject)}</div>
                <div style="font-size:14px;color:#526071;margin-bottom:10px;"><strong>${escapeHtml(item.from)}</strong> | ${escapeHtml(formatDate(item.receivedAt))}</div>
                <div style="font-size:14px;line-height:1.6;color:#324863;">${escapeHtml(truncateText(item.snippet, 180) || 'No extra details available.')}</div>
            </article>
        `).join('');
    }
}

export default EmailForwardService;
