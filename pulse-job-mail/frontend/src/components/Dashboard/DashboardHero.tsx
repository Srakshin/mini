import {Activity, MailCheck, Newspaper, Send} from "lucide-react";
import type {JobStats, NewsStats} from "@/types/api";
import {formatCompactNumber, formatDateTime} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {StatCard} from "@/components/shared/StatCard";

type DashboardHeroProps = {
    subscriberEmail?: string | null;
    jobStats?: JobStats;
    newsStats?: NewsStats;
    onRefresh: () => void;
    onSendPreviewDigest: () => void;
};

export const DashboardHero = ({subscriberEmail, jobStats, newsStats, onRefresh, onSendPreviewDigest}: DashboardHeroProps) => (
    <section className="space-y-6">
        <Card className="overflow-hidden border-primary/20 bg-hero-grid">
            <CardContent className="grid gap-6 p-8 lg:grid-cols-[1.8fr,1fr]">
                <div className="space-y-4">
                    <p className="text-sm uppercase tracking-[0.24em] text-primary">Subscriber command center</p>
                    <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                        {subscriberEmail ? `Updates for ${subscriberEmail}` : "Your hiring pipeline is ready."}
                    </h1>
                    <p className="max-w-2xl text-base text-muted-foreground">
                        This dashboard uses the saved email address as the destination for preference-based job and hiring updates.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={onRefresh}>Refresh dashboard</Button>
                        <Button variant="secondary" onClick={onSendPreviewDigest}>Send preview email</Button>
                        <div className="rounded-2xl border border-border/70 bg-background/50 px-4 py-2 text-sm text-muted-foreground">
                            Latest news sync: {formatDateTime(newsStats?.latestPublishedAt)}
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 rounded-3xl border border-border/70 bg-background/40 p-4 text-sm">
                    <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
                        <span className="text-muted-foreground">Delivery email</span>
                        <span className="font-semibold">{subscriberEmail || "Not set"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
                        <span className="text-muted-foreground">New jobs</span>
                        <span className="font-semibold">{formatCompactNumber(jobStats?.newJobs)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
                        <span className="text-muted-foreground">News articles</span>
                        <span className="font-semibold">{formatCompactNumber(newsStats?.totalArticles)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total jobs" value={formatCompactNumber(jobStats?.totalJobs)} hint="Everything captured so far" icon={<MailCheck className="h-5 w-5" />} />
            <StatCard label="Applied" value={formatCompactNumber(jobStats?.appliedJobs)} hint="Roles marked as in progress" icon={<Activity className="h-5 w-5" />} />
            <StatCard label="News volume" value={formatCompactNumber(newsStats?.totalArticles)} hint="Topic-matched market signals" icon={<Newspaper className="h-5 w-5" />} />
            <StatCard label="Preview ready" value={subscriberEmail ? "Yes" : "No"} hint="Send a test digest to this subscriber" icon={<Send className="h-5 w-5" />} />
        </div>
    </section>
);
