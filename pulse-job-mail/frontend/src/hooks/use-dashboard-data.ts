import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import api from "@/lib/api";
import type {ApiResponse, JobAlert, JobStats, NewsArticle, NewsStats, Pagination, Preferences, User} from "@/types/api";

type Filters = {
    subscriberEmail: string;
    jobPage: number;
    jobSearch?: string;
    jobStatus?: string;
    jobSource?: string;
    newsPage: number;
    newsSearch?: string;
    newsCategory?: string;
};

export const useDashboardData = (filters: Filters) => {
    const queryClient = useQueryClient();
    const enabled = Boolean(filters.subscriberEmail);

    const profileQuery = useQuery({
        queryKey: ["profile", filters.subscriberEmail],
        enabled,
        queryFn: async () => {
            const response = await api.get<ApiResponse<{user: User}>>("/auth/profile");
            return response.data.user;
        },
    });

    const preferencesQuery = useQuery({
        queryKey: ["preferences", filters.subscriberEmail],
        enabled,
        queryFn: async () => {
            const response = await api.get<ApiResponse<{preferences: Preferences}>>("/preferences");
            return response.data.preferences;
        },
    });

    const newsStatsQuery = useQuery({
        queryKey: ["news-stats", filters.subscriberEmail],
        enabled,
        queryFn: async () => {
            const response = await api.get<ApiResponse<{stats: NewsStats}>>("/news/stats");
            return response.data.stats;
        },
    });

    const jobsQuery = useQuery({
        queryKey: ["jobs", filters.subscriberEmail, filters.jobPage, filters.jobSearch, filters.jobStatus, filters.jobSource],
        enabled,
        queryFn: async () => {
            const response = await api.get<ApiResponse<{jobs: JobAlert[]; pagination: Pagination}>>("/jobs", {
                params: {
                    page: filters.jobPage,
                    limit: 8,
                    search: filters.jobSearch || undefined,
                    status: filters.jobStatus || undefined,
                    source: filters.jobSource || undefined,
                },
            });

            return {
                jobs: response.data.jobs,
                pagination: response.data.pagination,
            };
        },
    });

    const jobStatsQuery = useQuery({
        queryKey: ["job-stats", filters.subscriberEmail],
        enabled,
        queryFn: async () => {
            const response = await api.get<ApiResponse<{stats: JobStats}>>("/jobs/stats");
            return response.data.stats;
        },
    });

    const newsQuery = useQuery({
        queryKey: ["news", filters.subscriberEmail, filters.newsPage, filters.newsSearch, filters.newsCategory],
        enabled,
        queryFn: async () => {
            const response = await api.get<ApiResponse<{articles: NewsArticle[]; pagination: Pagination}>>("/news", {
                params: {
                    page: filters.newsPage,
                    limit: 6,
                    search: filters.newsSearch || undefined,
                    category: filters.newsCategory || undefined,
                },
            });

            return {
                articles: response.data.articles,
                pagination: response.data.pagination,
            };
        },
    });

    const refreshDashboard = async () => {
        await Promise.all([
            queryClient.invalidateQueries({queryKey: ["profile", filters.subscriberEmail]}),
            queryClient.invalidateQueries({queryKey: ["preferences", filters.subscriberEmail]}),
            queryClient.invalidateQueries({queryKey: ["job-stats", filters.subscriberEmail]}),
            queryClient.invalidateQueries({queryKey: ["jobs", filters.subscriberEmail]}),
            queryClient.invalidateQueries({queryKey: ["news-stats", filters.subscriberEmail]}),
            queryClient.invalidateQueries({queryKey: ["news", filters.subscriberEmail]}),
        ]);
    };

    const updatePreferencesMutation = useMutation({
        mutationFn: async (payload: Partial<Preferences>) => api.put("/preferences", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["preferences", filters.subscriberEmail]});
        },
    });

    const resetPreferencesMutation = useMutation({
        mutationFn: async () => api.post("/preferences/reset"),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["preferences", filters.subscriberEmail]});
        },
    });

    const sendPreviewDigestMutation = useMutation({
        mutationFn: async () => api.post("/email/digest/preview"),
    });

    const crawlJobsMutation = useMutation({
        mutationFn: async () => api.post("/jobs/crawl"),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["job-stats", filters.subscriberEmail]});
            await queryClient.invalidateQueries({queryKey: ["jobs", filters.subscriberEmail]});
        },
    });

    const pullNewsMutation = useMutation({
        mutationFn: async () => api.post("/news/pull"),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["news-stats", filters.subscriberEmail]});
            await queryClient.invalidateQueries({queryKey: ["news", filters.subscriberEmail]});
        },
    });

    const updateJobStatusMutation = useMutation({
        mutationFn: async ({jobId, status}: {jobId: string; status: string}) => api.patch(`/jobs/${jobId}/status`, {status}),
        onSuccess: async () => {
            await queryClient.invalidateQueries({queryKey: ["job-stats", filters.subscriberEmail]});
            await queryClient.invalidateQueries({queryKey: ["jobs", filters.subscriberEmail]});
        },
    });

    return {
        profileQuery,
        preferencesQuery,
        jobStatsQuery,
        jobsQuery,
        newsStatsQuery,
        newsQuery,
        refreshDashboard,
        updatePreferencesMutation,
        resetPreferencesMutation,
        sendPreviewDigestMutation,
        crawlJobsMutation,
        pullNewsMutation,
        updateJobStatusMutation,
    };
};
