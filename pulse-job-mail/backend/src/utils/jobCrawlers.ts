import "colors";
import axios from "axios";
import * as cheerio from "cheerio";
import {IUserPreference} from "../models/UserPreferenceSchema";

export type TCrawlerJob = {
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

type TCrawlerConfig = {
    name: string;
    url: string;
    companyFallback: string;
    selectors: string[];
    usePuppeteer?: boolean;
    parser: ($: cheerio.CheerioAPI, element: any) => TCrawlerJob | null;
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 PulseJobMailBot/1.0 Safari/537.36';

const cleanText = (value?: string | null) => {
    return (value || '').replace(/\s+/g, ' ').trim();
};

const normalizeUrl = (url: string, href?: string | null) => {
    if (!href) {
        return undefined;
    }

    try {
        return new URL(href, url).toString();
    } catch (error) {
        return href;
    }
};

const buildSearchQuery = (preferences: IUserPreference) => {
    const title = preferences.jobTitles[0] || preferences.keywords[0] || 'software engineer';
    const location = preferences.locations[0] || 'remote';

    return {
        title,
        location,
        encodedTitle: encodeURIComponent(title),
        encodedLocation: encodeURIComponent(location),
    };
};

const fetchHtml = async (url: string, usePuppeteer: boolean = false) => {
    if (usePuppeteer) {
        try {
            const runtimeRequire = eval('require');
            const puppeteer = runtimeRequire('puppeteer');
            const browser = await puppeteer.launch({headless: true});
            const page = await browser.newPage();
            await page.setUserAgent(USER_AGENT);
            await page.goto(url, {waitUntil: 'networkidle2', timeout: 30000});
            const content = await page.content();
            await browser.close();
            return content;
        } catch (error: any) {
            console.warn('Utility Warning: Puppeteer unavailable, falling back to Axios'.yellow, {
                url,
                message: error.message,
            });
        }
    }

    const {data} = await axios.get<string>(url, {
        timeout: 20000,
        headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
    });

    return data;
};

const scrapeJobs = async (config: TCrawlerConfig) => {
    try {
        console.info(`Utility: ${config.name} crawl started`.bgBlue.white.bold, {url: config.url});

        const html = await fetchHtml(config.url, config.usePuppeteer);
        const $ = cheerio.load(html);
        const jobs: TCrawlerJob[] = [];

        for (const selector of config.selectors) {
            $(selector).each((_, element) => {
                const parsed = config.parser($, element);
                if (parsed?.title && parsed?.company) {
                    jobs.push({
                        ...parsed,
                        sourceLabel: config.name.toLowerCase(),
                        company: parsed.company || config.companyFallback,
                    });
                }
            });

            if (jobs.length) {
                break;
            }
        }

        console.log(`SUCCESS: ${config.name} crawl completed`.bgGreen.bold, {count: jobs.length});
        return jobs;
    } catch (error: any) {
        console.error(`Utility Error: ${config.name} crawl failed`.red.bold, error.message);
        return [];
    }
};

export const crawlLinkedInJobs = async (preferences: IUserPreference) => {
    const search = buildSearchQuery(preferences);

    return scrapeJobs({
        name: 'LinkedIn',
        url: `https://www.linkedin.com/jobs/search/?keywords=${search.encodedTitle}&location=${search.encodedLocation}`,
        companyFallback: 'LinkedIn',
        selectors: ['.base-card', '.job-search-card', 'li'],
        usePuppeteer: true,
        parser: ($, element) => {
            const root = $(element);
            const title = cleanText(root.find('h3, .base-search-card__title').first().text());
            const company = cleanText(root.find('h4, .base-search-card__subtitle').first().text()) || 'LinkedIn';
            const location = cleanText(root.find('.job-search-card__location, .base-search-card__metadata').first().text());
            const url = normalizeUrl('https://www.linkedin.com', root.find('a').first().attr('href'));

            if (!title || !url) {
                return null;
            }

            return {
                title,
                company,
                location,
                url,
                description: `${title} role surfaced from LinkedIn search results`,
                tags: ['linkedin', search.title.toLowerCase()],
            };
        },
    });
};

export const crawlIndeedJobs = async (preferences: IUserPreference) => {
    const search = buildSearchQuery(preferences);

    return scrapeJobs({
        name: 'Indeed',
        url: `https://www.indeed.com/jobs?q=${search.encodedTitle}&l=${search.encodedLocation}`,
        companyFallback: 'Indeed',
        selectors: ['.job_seen_beacon', '[data-jk]', '.result'],
        parser: ($, element) => {
            const root = $(element);
            const title = cleanText(root.find('h2 a span, .jobTitle span').first().text());
            const company = cleanText(root.find('.companyName, [data-testid="company-name"]').first().text()) || 'Indeed';
            const location = cleanText(root.find('.companyLocation, [data-testid="text-location"]').first().text());
            const salary = cleanText(root.find('.salary-snippet, .estimated-salary').first().text());
            const url = normalizeUrl('https://www.indeed.com', root.find('h2 a, a.jcs-JobTitle').first().attr('href'));

            if (!title || !url) {
                return null;
            }

            return {
                title,
                company,
                location,
                salary,
                url,
                description: `${title} role surfaced from Indeed search results`,
                tags: ['indeed', search.title.toLowerCase()],
            };
        },
    });
};

export const crawlGlassdoorJobs = async (preferences: IUserPreference) => {
    const search = buildSearchQuery(preferences);

    return scrapeJobs({
        name: 'Glassdoor',
        url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${search.encodedTitle}&locT=C&locId=1147401`,
        companyFallback: 'Glassdoor',
        selectors: ['li[data-test="jobListing"]', '.JobsList_jobListItem__wjTHv', 'article'],
        usePuppeteer: true,
        parser: ($, element) => {
            const root = $(element);
            const title = cleanText(root.find('[data-test="job-title"], .JobCard_jobTitle__GLyJ1').first().text());
            const company = cleanText(root.find('[data-test="employer-name"], .EmployerProfile_compactEmployerName__9MGcV').first().text()) || 'Glassdoor';
            const location = cleanText(root.find('[data-test="emp-location"], .JobCard_location__Ds1fM').first().text());
            const url = normalizeUrl('https://www.glassdoor.com', root.find('a').first().attr('href'));

            if (!title || !url) {
                return null;
            }

            return {
                title,
                company,
                location,
                url,
                description: `${title} role surfaced from Glassdoor search results`,
                tags: ['glassdoor', search.title.toLowerCase()],
            };
        },
    });
};

export const crawlBigTechJobs = async (preferences: IUserPreference) => {
    const search = buildSearchQuery(preferences);
    const requestedCompanies = preferences.companies.map((company) => company.toLowerCase());
    const companyConfigs = [
        {
            name: 'Microsoft',
            url: `https://jobs.careers.microsoft.com/global/en/search?q=${search.encodedTitle}`,
        },
        {
            name: 'Amazon',
            url: `https://www.amazon.jobs/en/search?offset=0&result_limit=20&base_query=${search.encodedTitle}`,
        },
        {
            name: 'NVIDIA',
            url: `https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?q=${search.encodedTitle}`,
        },
        {
            name: 'AMD',
            url: `https://careers.amd.com/careers-home/jobs?keywords=${search.encodedTitle}`,
        },
        {
            name: 'DocuSign',
            url: `https://careers.docusign.com/jobs?keywords=${search.encodedTitle}`,
        },
    ]
        .filter((company) => !requestedCompanies.length || requestedCompanies.some((value) => company.name.toLowerCase().includes(value)));

    const results = await Promise.all(companyConfigs.map(async (company) => {
        return scrapeJobs({
            name: `BigTech:${company.name}`,
            url: company.url,
            companyFallback: company.name,
            selectors: ['article', 'li', '.job-result-card', '.ms-List-cell', '[data-automation-id="jobTitle"]'],
            usePuppeteer: true,
            parser: ($, element) => {
                const root = $(element);
                const title = cleanText(root.find('h2, h3, [data-test="job-title"], [data-automation-id="jobTitle"]').first().text()) || cleanText(root.text()).slice(0, 120);
                const location = cleanText(root.find('.location, [data-test="job-location"], .job-location, [data-automation-id="locations"]').first().text());
                const jobType = cleanText(root.find('.job-type, [data-test="job-type"]').first().text());
                const url = normalizeUrl(company.url, root.find('a').first().attr('href'));

                if (!title || !url) {
                    return null;
                }

                return {
                    title,
                    company: company.name,
                    location,
                    jobType,
                    url,
                    description: `${title} role surfaced from ${company.name} careers`,
                    tags: ['big-tech', company.name.toLowerCase(), search.title.toLowerCase()],
                };
            },
        });
    }));

    return results.flat();
};

export const crawlJobsForPreferences = async (preferences: IUserPreference) => {
    const crawlerResults = await Promise.allSettled([
        crawlLinkedInJobs(preferences),
        crawlIndeedJobs(preferences),
        crawlGlassdoorJobs(preferences),
        crawlBigTechJobs(preferences),
    ]);

    const dedupedMap = new Map<string, TCrawlerJob>();

    crawlerResults.forEach((result) => {
        if (result.status !== 'fulfilled') {
            return;
        }

        result.value.forEach((job) => {
            const dedupeKey = `${job.url || ''}|${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
            if (!dedupedMap.has(dedupeKey)) {
                dedupedMap.set(dedupeKey, job);
            }
        });
    });

    return Array.from(dedupedMap.values());
};
