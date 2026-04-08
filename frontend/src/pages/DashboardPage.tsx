import {startTransition, useDeferredValue, useMemo, useState} from "react";
import {toast} from "sonner";
import {DashboardHero} from "@/components/Dashboard/DashboardHero";
import {PreferenceFilters} from "@/components/Filters/PreferenceFilters";
import {JobList} from "@/components/JobList/JobList";
import {AppShell} from "@/components/layout/AppShell";
import {NewsFeed} from "@/components/NewsFeed/NewsFeed";
import {useDashboardData} from "@/hooks/use-dashboard-data";
import {useSubscriber} from "@/hooks/use-subscriber";
import {extractApiError} from "@/lib/api";

export const DashboardPage = () => {
    const {subscriberEmail} = useSubscriber();
    const [jobSearchInput, setJobSearchInput] = useState("");
    const [jobStatus, setJobStatus] = useState("");
    const [jobSource, setJobSource] = useState("");
    const [jobPage, setJobPage] = useState(1);
    const [newsSearchInput, setNewsSearchInput] = useState("");
    const [newsCategory, setNewsCategory] = useState("");
    const [newsPage, setNewsPage] = useState(1);

    const deferredJobSearch = useDeferredValue(jobSearchInput);
    const deferredNewsSearch = useDeferredValue(newsSearchInput);

    const dashboard = useDashboardData({
        subscriberEmail: subscriberEmail || "",
        jobPage,
        jobSearch: deferredJobSearch,
        jobStatus,
        jobSource,
        newsPage,
        newsSearch: deferredNewsSearch,
        newsCategory,
    });

    const newsCategories = useMemo(() => {
        return Object.keys(dashboard.newsStatsQuery.data?.categories || {});
    }, [dashboard.newsStatsQuery.data]);

    return (
        <AppShell>
            <div className="space-y-8">
                <DashboardHero
                    subscriberEmail={subscriberEmail}
                    jobStats={dashboard.jobStatsQuery.data}
                    newsStats={dashboard.newsStatsQuery.data}
                    onRefresh={async () => {
                        try {
                            await dashboard.refreshDashboard();
                            toast.success("Dashboard refreshed.");
                        } catch (error) {
                            toast.error(extractApiError(error));
                        }
                    }}
                    onSendPreviewDigest={async () => {
                        try {
                            await dashboard.sendPreviewDigestMutation.mutateAsync();
                            toast.success("Preview email sent.");
                        } catch (error) {
                            toast.error(extractApiError(error));
                        }
                    }}
                />

                <div className="grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
                    <div className="space-y-8">
                        <PreferenceFilters
                            preferences={dashboard.preferencesQuery.data}
                            saving={dashboard.updatePreferencesMutation.isPending || dashboard.resetPreferencesMutation.isPending}
                            onSave={async (payload) => {
                                try {
                                    await dashboard.updatePreferencesMutation.mutateAsync(payload);
                                    toast.success("Preferences saved.");
                                } catch (error) {
                                    toast.error(extractApiError(error));
                                }
                            }}
                            onReset={async () => {
                                try {
                                    await dashboard.resetPreferencesMutation.mutateAsync();
                                    toast.success("Preferences reset.");
                                } catch (error) {
                                    toast.error(extractApiError(error));
                                }
                            }}
                        />
                    </div>

                    <div className="space-y-8">
                        <JobList
                            jobs={dashboard.jobsQuery.data?.jobs || []}
                            pagination={dashboard.jobsQuery.data?.pagination}
                            search={jobSearchInput}
                            status={jobStatus}
                            source={jobSource}
                            loading={dashboard.crawlJobsMutation.isPending || dashboard.updateJobStatusMutation.isPending}
                            onSearchChange={(value) => {
                                setJobSearchInput(value);
                                startTransition(() => setJobPage(1));
                            }}
                            onStatusChange={(value) => {
                                setJobStatus(value);
                                startTransition(() => setJobPage(1));
                            }}
                            onSourceChange={(value) => {
                                setJobSource(value);
                                startTransition(() => setJobPage(1));
                            }}
                            onPageChange={(page) => startTransition(() => setJobPage(page))}
                            onRefresh={async () => {
                                await dashboard.jobsQuery.refetch();
                            }}
                            onCrawl={async () => {
                                try {
                                    await dashboard.crawlJobsMutation.mutateAsync();
                                    toast.success("Crawler finished.");
                                } catch (error) {
                                    toast.error(extractApiError(error));
                                }
                            }}
                            onUpdateStatus={async (jobId, status) => {
                                try {
                                    await dashboard.updateJobStatusMutation.mutateAsync({jobId, status});
                                    toast.success("Job status updated.");
                                } catch (error) {
                                    toast.error(extractApiError(error));
                                }
                            }}
                        />

                        <NewsFeed
                            articles={dashboard.newsQuery.data?.articles || []}
                            pagination={dashboard.newsQuery.data?.pagination}
                            search={newsSearchInput}
                            category={newsCategory}
                            categories={newsCategories}
                            loading={dashboard.pullNewsMutation.isPending}
                            onSearchChange={(value) => {
                                setNewsSearchInput(value);
                                startTransition(() => setNewsPage(1));
                            }}
                            onCategoryChange={(value) => {
                                setNewsCategory(value);
                                startTransition(() => setNewsPage(1));
                            }}
                            onPageChange={(page) => startTransition(() => setNewsPage(page))}
                            onRefresh={async () => {
                                await dashboard.newsQuery.refetch();
                            }}
                            onPullNews={async () => {
                                try {
                                    await dashboard.pullNewsMutation.mutateAsync();
                                    toast.success("News feeds refreshed.");
                                } catch (error) {
                                    toast.error(extractApiError(error));
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </AppShell>
    );
};
