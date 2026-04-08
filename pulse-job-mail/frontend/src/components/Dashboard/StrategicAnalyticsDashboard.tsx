"use client";

import {AnimatePresence, motion} from "motion/react";
import {useEffect, useMemo, useState} from "react";
import {
    BellRing,
    BriefcaseBusiness,
    ChevronRight,
    ExternalLink,
    Filter,
    LayoutDashboard,
    Mail,
    Newspaper,
    RefreshCcw,
    Search,
    Send,
    Sparkles,
    Target,
    TrendingUp,
    UserRound,
} from "lucide-react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type {
    JobAlert,
    JobStats,
    NewsArticle,
    NewsStats,
    Pagination,
    Preferences,
} from "@/types/api";
import {contentFilters, deliveryModes, jobSources, jobStatuses} from "@/lib/constants";
import {
    formatCompactNumber,
    formatDateTime,
    getInitials,
    parseCommaSeparated,
    stringifyCommaSeparated,
} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {Textarea} from "@/components/ui/textarea";

type StrategicAnalyticsDashboardProps = {
    subscriberEmail?: string | null;
    preferences?: Preferences;
    savingPreferences?: boolean;
    jobStats?: JobStats;
    newsStats?: NewsStats;
    jobs: JobAlert[];
    jobPagination?: Pagination;
    jobSearch: string;
    jobStatus: string;
    jobSource: string;
    articles: NewsArticle[];
    newsPagination?: Pagination;
    newsSearch: string;
    newsCategory: string;
    newsCategories: string[];
    onRefresh: () => Promise<void>;
    onSendPreviewDigest: () => Promise<void>;
    onChangeSubscriber: () => void;
    onSavePreferences: (payload: Partial<Preferences>) => Promise<void>;
    onResetPreferences: () => Promise<void>;
    onJobSearchChange: (value: string) => void;
    onJobStatusChange: (value: string) => void;
    onJobSourceChange: (value: string) => void;
    onJobPageChange: (page: number) => void;
    onCrawlJobs: () => Promise<void>;
    onUpdateJobStatus: (jobId: string, status: string) => Promise<void>;
    onNewsSearchChange: (value: string) => void;
    onNewsCategoryChange: (value: string) => void;
    onNewsPageChange: (page: number) => void;
    onPullNews: () => Promise<void>;
};

const navTabs = [
    {id: "overview", label: "Overview", icon: LayoutDashboard},
    {id: "jobs", label: "Jobs", icon: BriefcaseBusiness},
    {id: "signals", label: "Signals", icon: Newspaper},
    {id: "delivery", label: "Delivery", icon: Send},
] as const;

const chartColors = {
    jobs: "#60a5fa",
    news: "#22c55e",
    signal: "#f59e0b",
};

const blackInputClassName = "border-white/10 bg-white/[0.03] text-white placeholder:text-white/35";
const blackSelectClassName = "h-11 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none transition focus:border-cyan-400";
const panelClassName = "rounded-[1.5rem] border border-white/10 bg-[#050505] shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

const buildActivitySeries = (jobs: JobAlert[], articles: NewsArticle[]) => {
    const buckets = Array.from({length: 7}, (_, index) => {
        const day = new Date();
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - (6 - index));

        return {
            date: day,
            label: day.toLocaleDateString("en-US", {weekday: "short"}),
            jobs: 0,
            news: 0,
            signal: 0,
        };
    });

    const keyToIndex = new Map(buckets.map((bucket, index) => [bucket.date.toDateString(), index]));

    jobs.forEach((job) => {
        const rawDate = job.postedAt || job.emailReceivedAt || job.createdAt;
        if (!rawDate) {
            return;
        }

        const parsed = new Date(rawDate);
        parsed.setHours(0, 0, 0, 0);
        const index = keyToIndex.get(parsed.toDateString());

        if (index !== undefined) {
            buckets[index].jobs += 1;
        }
    });

    articles.forEach((article) => {
        const rawDate = article.publishedAt || article.createdAt;
        if (!rawDate) {
            return;
        }

        const parsed = new Date(rawDate);
        parsed.setHours(0, 0, 0, 0);
        const index = keyToIndex.get(parsed.toDateString());

        if (index !== undefined) {
            buckets[index].news += 1;
        }
    });

    return buckets.map((bucket) => ({
        label: bucket.label,
        jobs: bucket.jobs,
        news: bucket.news,
        signal: bucket.jobs * 2 + bucket.news,
    }));
};

const labelForFilter = (value: Preferences["contentFilters"][number]) => {
    return contentFilters.find((item) => item.value === value)?.label || value;
};

const labelForDeliveryMode = (value?: Preferences["deliveryMode"]) => {
    return deliveryModes.find((item) => item.value === value)?.label || value || "Smart summary";
};

const parseEmailLimit = (value: string, fallback: number) => {
    const trimmed = value.trim();

    if (!trimmed) {
        return fallback;
    }

    const numericValue = Number(trimmed);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return fallback;
    }

    return Math.floor(numericValue);
};

const MetricCard = ({
    title,
    value,
    accent,
    description,
    details,
    actionLabel,
    onAction,
    expanded,
    onToggle,
}: {
    title: string;
    value: string;
    accent: string;
    description: string;
    details: Array<{label: string; value: string}>;
    actionLabel: string;
    onAction: () => void;
    expanded: boolean;
    onToggle: () => void;
}) => (
    <motion.div
        layout
        className="min-w-[220px] flex-1 cursor-pointer overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#090909] shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
        onClick={onToggle}
        whileHover={{y: -4, boxShadow: `0 20px 60px ${accent}22`}}
        transition={{duration: 0.2, ease: "easeInOut"}}
    >
        <div className="p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">{title}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className="rounded-full border px-3 py-1 text-xs" style={{borderColor: `${accent}55`, color: accent}}>
                    live
                </div>
            </div>
            <p className="text-sm text-white/55">{description}</p>

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{height: 0, opacity: 0}}
                        animate={{height: "auto", opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.25, ease: "easeInOut"}}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 border-t border-white/10 pt-4">
                            <div className="mb-4 grid gap-2 sm:grid-cols-3">
                                {details.map((detail) => (
                                    <div key={detail.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                        <p className="text-xs uppercase tracking-[0.16em] text-white/35">{detail.label}</p>
                                        <p className="mt-2 text-sm font-medium text-white">{detail.value}</p>
                                    </div>
                                ))}
                            </div>
                            <Button
                                className="w-full bg-transparent text-white hover:bg-white/10"
                                style={{border: `1px solid ${accent}`}}
                                variant="ghost"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onAction();
                                }}
                            >
                                {actionLabel}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
        <div className="h-1 w-full" style={{background: `linear-gradient(90deg, ${accent}, transparent)`}} />
    </motion.div>
);

const PriorityCard = ({
    title,
    subtitle,
    items,
    expanded,
    onToggle,
}: {
    title: string;
    subtitle: string;
    items: string[];
    expanded: boolean;
    onToggle: () => void;
}) => (
    <motion.button
        layout
        className="w-full overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-4 text-left"
        onClick={onToggle}
        whileHover={{x: 4, borderColor: "rgba(96,165,250,0.55)"}}
        transition={{duration: 0.2, ease: "easeInOut"}}
    >
        <div className="flex items-start justify-between gap-3">
            <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-1 text-xs text-white/45">{subtitle}</p>
            </div>
            <motion.div animate={{rotate: expanded ? 90 : 0}}>
                <ChevronRight className="h-4 w-4 text-white/50" />
            </motion.div>
        </div>
        <AnimatePresence initial={false}>
            {expanded && (
                <motion.div
                    initial={{height: 0, opacity: 0}}
                    animate={{height: "auto", opacity: 1}}
                    exit={{height: 0, opacity: 0}}
                    transition={{duration: 0.2}}
                    className="overflow-hidden"
                >
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                        {items.length === 0 ? (
                            <span className="text-sm text-white/35">Nothing configured yet.</span>
                        ) : items.map((item) => (
                            <span key={item} className="rounded-full border border-white/10 bg-black px-3 py-1 text-xs text-white/70">
                                {item}
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.button>
);

function ActivityTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{color: string; name: string; value: number}>;
    label?: string;
}) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-xl border border-white/10 bg-black/95 p-3 shadow-xl">
            <p className="mb-2 text-sm font-medium text-white">{label}</p>
            <div className="space-y-1">
                {payload.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-xs text-white/65">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: entry.color}} />
                        <span>{entry.name}</span>
                        <span className="font-medium text-white">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export const StrategicAnalyticsDashboard = ({
    subscriberEmail,
    preferences,
    savingPreferences,
    jobStats,
    newsStats,
    jobs,
    jobPagination,
    jobSearch,
    jobStatus,
    jobSource,
    articles,
    newsPagination,
    newsSearch,
    newsCategory,
    newsCategories,
    onRefresh,
    onSendPreviewDigest,
    onChangeSubscriber,
    onSavePreferences,
    onResetPreferences,
    onJobSearchChange,
    onJobStatusChange,
    onJobSourceChange,
    onJobPageChange,
    onCrawlJobs,
    onUpdateJobStatus,
    onNewsSearchChange,
    onNewsCategoryChange,
    onNewsPageChange,
    onPullNews,
}: StrategicAnalyticsDashboardProps) => {
    const [expandedMetricId, setExpandedMetricId] = useState<string | null>("new-jobs");
    const [expandedPriorityId, setExpandedPriorityId] = useState<string | null>("filters");
    const [activeTab, setActiveTab] = useState<(typeof navTabs)[number]["id"]>("overview");
    const [form, setForm] = useState({
        contentFilters: preferences?.contentFilters || ["job_updates"],
        deliveryMode: preferences?.deliveryMode || "smart_summary",
        keywords: stringifyCommaSeparated(preferences?.keywords),
        companies: stringifyCommaSeparated(preferences?.companies),
        jobTitles: stringifyCommaSeparated(preferences?.jobTitles),
        locations: stringifyCommaSeparated(preferences?.locations),
        notificationSchedule: preferences?.notificationSchedule || "0 9 * * *",
        timezone: preferences?.timezone || "UTC",
        maxJobsInEmail: String(preferences?.maxJobsInEmail ?? 6),
        maxNewsInEmail: String(preferences?.maxNewsInEmail ?? 6),
        maxTimeDateItemsInEmail: String(preferences?.maxTimeDateItemsInEmail ?? 4),
    });

    useEffect(() => {
        if (!preferences) {
            return;
        }

        setForm({
            contentFilters: preferences.contentFilters,
            deliveryMode: preferences.deliveryMode,
            keywords: stringifyCommaSeparated(preferences.keywords),
            companies: stringifyCommaSeparated(preferences.companies),
            jobTitles: stringifyCommaSeparated(preferences.jobTitles),
            locations: stringifyCommaSeparated(preferences.locations),
            notificationSchedule: preferences.notificationSchedule,
            timezone: preferences.timezone,
            maxJobsInEmail: String(preferences.maxJobsInEmail),
            maxNewsInEmail: String(preferences.maxNewsInEmail),
            maxTimeDateItemsInEmail: String(preferences.maxTimeDateItemsInEmail),
        });
    }, [preferences]);

    const activitySeries = useMemo(() => buildActivitySeries(jobs, articles), [articles, jobs]);
    const activeFilterCount = useMemo(() => {
        return (preferences?.keywords.length || 0)
            + (preferences?.companies.length || 0)
            + (preferences?.jobTitles.length || 0)
            + (preferences?.locations.length || 0);
    }, [preferences]);
    const topCategory = useMemo(() => {
        const entries = Object.entries(newsStats?.categories || {}).sort((a, b) => b[1] - a[1]);
        return entries[0];
    }, [newsStats]);

    const priorityCards = useMemo(() => ([
        {
            id: "filters",
            title: "Content scope",
            subtitle: `${preferences?.contentFilters.length || 0} active streams`,
            items: (preferences?.contentFilters || []).map(labelForFilter),
        },
        {
            id: "keywords",
            title: "Keywords",
            subtitle: `${preferences?.keywords.length || 0} tracked terms`,
            items: preferences?.keywords || [],
        },
        {
            id: "companies",
            title: "Companies",
            subtitle: `${preferences?.companies.length || 0} company targets`,
            items: preferences?.companies || [],
        },
        {
            id: "roles",
            title: "Job titles",
            subtitle: `${preferences?.jobTitles.length || 0} role targets`,
            items: preferences?.jobTitles || [],
        },
        {
            id: "locations",
            title: "Locations",
            subtitle: `${preferences?.locations.length || 0} location filters`,
            items: preferences?.locations || [],
        },
        {
            id: "delivery",
            title: "Delivery plan",
            subtitle: `${labelForDeliveryMode(preferences?.deliveryMode)} • ${preferences?.timezone || "UTC"}`,
            items: [
                `Schedule: ${preferences?.notificationSchedule || "0 9 * * *"}`,
                `Jobs/email: ${preferences?.maxJobsInEmail ?? 6}`,
                `News/email: ${preferences?.maxNewsInEmail ?? 6}`,
                `Calendar/email: ${preferences?.maxTimeDateItemsInEmail ?? 4}`,
            ],
        },
    ]), [preferences]);

    const insights = useMemo(() => {
        const newestJob = jobs[0];
        const newestArticle = articles[0];

        return [
            {
                id: "jobs",
                title: jobStats?.newJobs ? `${jobStats.newJobs} new roles waiting review` : "No new roles in the current view",
                description: newestJob ? `${newestJob.title} at ${newestJob.company}` : "Run the crawler to refresh the inbound role queue.",
                tag: "Job flow",
            },
            {
                id: "news",
                title: topCategory ? `${topCategory[0]} is leading the news signal` : "News categories will appear after the next sync",
                description: newestArticle ? newestArticle.title : "Pull the latest news feed to surface market movement.",
                tag: "News pulse",
            },
            {
                id: "prefs",
                title: activeFilterCount > 0 ? `${activeFilterCount} filter targets are shaping the digest` : "Filters are still broad",
                description: preferences?.deliveryMode ? `Delivery mode: ${labelForDeliveryMode(preferences.deliveryMode)}` : "Set delivery mode and targeting rules in the studio.",
                tag: "Preferences",
            },
        ];
    }, [activeFilterCount, articles, jobStats?.newJobs, jobs, preferences?.deliveryMode, topCategory]);

    const pillarCards = [
        {
            id: "total-jobs",
            label: "Pipeline captured",
            value: formatCompactNumber(jobStats?.totalJobs),
            accent: "#60a5fa",
            detail: `${formatCompactNumber(jobStats?.gmailJobs)} gmail / ${formatCompactNumber(jobStats?.crawledJobs)} crawled`,
        },
        {
            id: "new-jobs",
            label: "Fresh matches",
            value: formatCompactNumber(jobStats?.newJobs),
            accent: "#22c55e",
            detail: `${jobs.length} visible in this view`,
        },
        {
            id: "applied",
            label: "Applied roles",
            value: formatCompactNumber(jobStats?.appliedJobs),
            accent: "#f59e0b",
            detail: "Roles already acted on",
        },
        {
            id: "signals",
            label: "News signals",
            value: formatCompactNumber(newsStats?.totalArticles),
            accent: "#f472b6",
            detail: topCategory ? `${topCategory[0]} leads current volume` : "Waiting for news sync",
        },
    ];

    const metricCards = [
        {
            id: "new-jobs",
            title: "New Jobs",
            value: formatCompactNumber(jobStats?.newJobs),
            accent: "#22c55e",
            description: "Recent opportunities ready for review and digest inclusion.",
            details: [
                {label: "Gmail", value: formatCompactNumber(jobStats?.gmailJobs)},
                {label: "Crawler", value: formatCompactNumber(jobStats?.crawledJobs)},
                {label: "Page", value: `${jobPagination?.page || 1}/${jobPagination?.totalPages || 1}`},
            ],
            actionLabel: "Run crawler",
            onAction: onCrawlJobs,
        },
        {
            id: "applied-roles",
            title: "Applied Roles",
            value: formatCompactNumber(jobStats?.appliedJobs),
            accent: "#60a5fa",
            description: "Pipeline momentum across roles already marked as acted on.",
            details: [
                {label: "Archived", value: formatCompactNumber(jobStats?.archivedJobs)},
                {label: "Visible", value: String(jobs.length)},
                {label: "Status", value: jobStatus || "all"},
            ],
            actionLabel: "Refresh dashboard",
            onAction: onRefresh,
        },
        {
            id: "news-signals",
            title: "News Signals",
            value: formatCompactNumber(newsStats?.totalArticles),
            accent: "#f59e0b",
            description: "Fresh market and hiring stories that can feed subscriber digests.",
            details: [
                {label: "Categories", value: String(newsCategories.length)},
                {label: "Top topic", value: topCategory?.[0] || "none"},
                {label: "Page", value: `${newsPagination?.page || 1}/${newsPagination?.totalPages || 1}`},
            ],
            actionLabel: "Pull latest news",
            onAction: onPullNews,
        },
        {
            id: "active-filters",
            title: "Active Filters",
            value: String(activeFilterCount),
            accent: "#f472b6",
            description: "Tracking rules currently shaping the role and news match engine.",
            details: [
                {label: "Keywords", value: String(preferences?.keywords.length || 0)},
                {label: "Companies", value: String(preferences?.companies.length || 0)},
                {label: "Locations", value: String(preferences?.locations.length || 0)},
            ],
            actionLabel: "Send preview digest",
            onAction: onSendPreviewDigest,
        },
    ];

    return (
        <div className="min-h-screen bg-black text-white">
            <div
                className="fixed inset-0 pointer-events-none opacity-40"
                style={{
                    backgroundImage: "radial-gradient(circle at top, rgba(96,165,250,0.14), transparent 28%), radial-gradient(circle at 80% 20%, rgba(34,197,94,0.12), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.02), transparent 32%)",
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.08]"
                style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }}
            />

            <div className="relative z-10 flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                                <BriefcaseBusiness className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Pulse Job Mail</p>
                                <p className="text-sm text-white/55">Subscriber intelligence dashboard</p>
                            </div>
                        </div>

                        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 lg:flex">
                            {navTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${isActive ? "bg-white text-black" : "text-white/55 hover:text-white"}`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="flex items-center gap-3">
                            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 sm:block">
                                <p className="text-sm font-medium text-white">{subscriberEmail || "Subscriber"}</p>
                                <p className="text-xs text-white/40">Digest destination</p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold">
                                {getInitials(subscriberEmail || "Subscriber")}
                            </div>
                            <Button className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10" variant="outline" onClick={onChangeSubscriber}>
                                Change email
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-[1600px] flex-1 overflow-hidden px-4 pb-32 pt-4 sm:px-6">
