import "colors";
import axios from "axios";
import NewsArticleModel, {INewsArticle} from "../models/NewsArticleSchema";
import UserPreferenceModel from "../models/UserPreferenceSchema";
import AISummarizerService from "./AISummarizerService";
import UserPreferencesService from "./UserPreferencesService";

type TFeedArticle = {
    title: string;
    source: string;
    description?: string;
    url: string;
    publishedAt?: Date;
    category?: string;
    tags?: string[];
};

const FEED_SOURCES = [
    {
        source: 'Google News',
        category: 'tech-jobs',
        url: 'https://news.google.com/rss/search?q=tech%20jobs%20OR%20engineering%20hiring%20OR%20software%20careers&hl=en-US&gl=US&ceid=US:en',
        tags: ['jobs', 'hiring', 'tech'],
    },
    {
        source: 'Google News',
        category: 'startups',
        url: 'https://news.google.com/rss/search?q=startup%20funding%20OR%20startup%20hiring%20OR%20careers&hl=en-US&gl=US&ceid=US:en',
        tags: ['startup', 'careers'],
    },
    {
        source: 'Google News',
        category: 'ai-market',
        url: 'https://news.google.com/rss/search?q=AI%20jobs%20OR%20developer%20market%20OR%20engineering%20teams&hl=en-US&gl=US&ceid=US:en',
        tags: ['ai', 'developer', 'market'],
    },
    {
        source: 'Google News',
        category: 'layoffs',
        url: 'https://news.google.com/rss/search?q=tech%20layoffs%20OR%20company%20restructuring%20OR%20hiring%20freeze&hl=en-US&gl=US&ceid=US:en',
        tags: ['layoffs', 'market'],
    },
];

const decodeEntities = (value?: string) => {
    return (value || '')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
};

const stripHtml = (value?: string) => {
    return decodeEntities(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const extractTagValue = (block: string, tagName: string) => {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    return block.match(regex)?.[1];
};

class NewsAggregatorService {

    /**
     * Pull fresh articles from configured RSS feeds and store them globally.
     */
    static async syncNewsForAllUsers() {
        try {
            console.log('Service: NewsAggregatorService.syncNewsForAllUsers called'.cyan.italic);

            const articles: INewsArticle[] = [];
            const settledFeeds = await Promise.all(
                FEED_SOURCES.map(async (feed) => {
                    return this.fetchFeedArticles(feed.url, feed.source, feed.category, feed.tags);
                }),
            );

            for (const parsedArticles of settledFeeds) {
                for (const article of parsedArticles) {
                    let storedArticle = await NewsArticleModel.findOne({url: article.url});
                    const isNewArticle = !storedArticle;

                    if (!storedArticle) {
                        storedArticle = new NewsArticleModel({
                            title: article.title,
                            source: article.source,
                            description: article.description,
                            url: article.url,
                            publishedAt: article.publishedAt,
                            category: article.category,
                            tags: article.tags || [],
                        });
                    }

                    storedArticle.title = article.title;
                    storedArticle.source = article.source;
                    storedArticle.description = article.description;
                    storedArticle.publishedAt = article.publishedAt;
                    storedArticle.category = article.category;
                    storedArticle.tags = article.tags || [];

                    if (!storedArticle.aiSummary) {
                        storedArticle.aiSummary = await AISummarizerService.summarizeNewsArticle({
                            title: storedArticle.title,
                            source: storedArticle.source,
                            description: storedArticle.description,
                            category: storedArticle.category,
                        });
                    }

                    await storedArticle.save();
                    if (isNewArticle) {
                        articles.push(storedArticle);
                    }
                }
            }

            console.log('SUCCESS: Global news sync completed'.bgGreen.bold, {count: articles.length});
            return {articles};
        } catch (error: any) {
            console.error('Service Error: NewsAggregatorService.syncNewsForAllUsers failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Return the latest news tailored to a specific user.
     */
    static async getNewsForUser(userId: string, params: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
    } = {}) {
        try {
            console.log('Service: NewsAggregatorService.getNewsForUser called'.cyan.italic, {userId, params});

            const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(userId);
            const page = Math.max(1, Number(params.page) || 1);
            const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));

            const query: Record<string, any> = {};
            if (params.search) {
                query.$text = {$search: params.search};
            }
            if (params.category) {
                query.category = params.category;
            }

            const allArticles = await NewsArticleModel.find(query)
                .sort({publishedAt: -1, createdAt: -1})
                .limit(150);

            const filteredArticles = allArticles.filter((article) => {
                return UserPreferencesService.matchesNewsPreferences(preferences, {
                    title: article.title,
                    source: article.source,
                    description: article.description,
                    category: article.category,
                    tags: article.tags,
                });
            });

            const startIndex = (page - 1) * limit;
            const articles = filteredArticles.slice(startIndex, startIndex + limit);

            console.log('SUCCESS: Tailored news fetched'.bgGreen.bold, {
                userId,
                total: filteredArticles.length,
            });

            return {
                articles,
                pagination: {
                    page,
                    limit,
                    total: filteredArticles.length,
                    totalPages: Math.max(1, Math.ceil(filteredArticles.length / limit)),
                },
            };
        } catch (error: any) {
            console.error('Service Error: NewsAggregatorService.getNewsForUser failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Filter a set of freshly synced articles for one user.
     */
    static async filterArticlesForUser(userId: string, articles: INewsArticle[]) {
        const {preferences} = await UserPreferencesService.getOrCreateUserPreferences(userId);

        return articles.filter((article) => {
            return UserPreferencesService.matchesNewsPreferences(preferences, {
                title: article.title,
                source: article.source,
                description: article.description,
                category: article.category,
                tags: article.tags,
            });
        });
    }

    /**
     * Aggregate simple stats for the news dashboard.
     */
    static async getNewsStatsForUser(userId: string) {
        try {
            console.log('Service: NewsAggregatorService.getNewsStatsForUser called'.cyan.italic, {userId});

            const {articles} = await this.getNewsForUser(userId, {page: 1, limit: 100});
            const categories = articles.reduce<Record<string, number>>((accumulator, article) => {
                const key = article.category || 'general';
                accumulator[key] = (accumulator[key] || 0) + 1;
                return accumulator;
            }, {});

            return {
                totalArticles: articles.length,
                categories,
                latestPublishedAt: articles[0]?.publishedAt || null,
            };
        } catch (error: any) {
            console.error('Service Error: NewsAggregatorService.getNewsStatsForUser failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Build dynamic RSS feeds from user preference terms.
     */
    static async syncNewsForUserTopics() {
        try {
            console.log('Service: NewsAggregatorService.syncNewsForUserTopics called'.cyan.italic);

            const preferences = await UserPreferenceModel.find({});
            const dynamicTerms = new Set<string>();

            preferences.forEach((preference) => {
                UserPreferencesService.buildSearchTerms(preference).forEach((term) => dynamicTerms.add(term));
            });

            const sources = Array.from(dynamicTerms)
                .filter(Boolean)
                .slice(0, 10)
                .map((term) => ({
                    source: 'Google News',
                    category: 'custom',
                    url: `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=en-US&gl=US&ceid=US:en`,
                    tags: ['custom', term],
                }));

            const articles: INewsArticle[] = [];
            for (const source of sources) {
                const parsedArticles = await this.fetchFeedArticles(source.url, source.source, source.category, source.tags);
                for (const article of parsedArticles) {
                    let storedArticle = await NewsArticleModel.findOne({url: article.url});
                    if (!storedArticle) {
                        storedArticle = new NewsArticleModel(article);
                    }

                    storedArticle.title = article.title;
                    storedArticle.source = article.source;
                    storedArticle.description = article.description;
                    storedArticle.publishedAt = article.publishedAt;
                    storedArticle.category = article.category;
                    storedArticle.tags = article.tags || [];

                    if (!storedArticle.aiSummary) {
                        storedArticle.aiSummary = await AISummarizerService.summarizeNewsArticle({
                            title: storedArticle.title,
                            source: storedArticle.source,
                            description: storedArticle.description,
                            category: storedArticle.category,
                        });
                    }

                    await storedArticle.save();
                    articles.push(storedArticle);
                }
            }

            console.log('SUCCESS: Dynamic user-topic news sync completed'.bgGreen.bold, {count: articles.length});
            return {articles};
        } catch (error: any) {
            console.error('Service Error: NewsAggregatorService.syncNewsForUserTopics failed'.red.bold, error);
            throw error;
        }
    }

    /**
     * Fetch and parse a single RSS feed.
     */
    private static async fetchFeedArticles(feedUrl: string, source: string, category: string, tags: string[] = []) {
        try {
            const {data} = await axios.get<string>(feedUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'PulseJobMail/1.0 (+https://pulsejobmail.local)',
                    Accept: 'application/rss+xml, application/xml, text/xml, */*',
                },
            });

            const items = data.match(/<item>[\s\S]*?<\/item>/gi) || [];

            return items
                .map<TFeedArticle | null>((item) => {
                    const title = stripHtml(extractTagValue(item, 'title'));
                    const url = stripHtml(extractTagValue(item, 'link'));
                    const description = stripHtml(extractTagValue(item, 'description'));
                    const pubDate = extractTagValue(item, 'pubDate');
                    const articleSource = stripHtml(extractTagValue(item, 'source')) || source;

                    if (!title || !url) {
                        return null;
                    }

                    return {
                        title,
                        source: articleSource,
                        description,
                        url,
                        publishedAt: pubDate ? new Date(pubDate) : undefined,
                        category,
                        tags,
                    };
                })
                .filter((article): article is TFeedArticle => Boolean(article));
        } catch (error: any) {
            console.error('Service Error: NewsAggregatorService.fetchFeedArticles failed'.red.bold, {
                source,
                feedUrl,
                message: error.message,
            });
            return [];
        }
    }
}

export default NewsAggregatorService;
