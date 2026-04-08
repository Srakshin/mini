export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export const SUBSCRIBER_EMAIL_KEY = "pulsejobmail-subscriber-email";

export const deliveryModes = [
    {value: "full_emails", label: "Full emails"},
    {value: "smart_summary", label: "Smart summary"},
    {value: "dashboard_only", label: "Website only"},
] as const;

export const contentFilters = [
    {value: "job_updates", label: "Job updates"},
    {value: "news", label: "News"},
    {value: "time_date", label: "Time & date"},
] as const;

export const jobStatuses = ["new", "read", "applied", "archived"] as const;
export const jobSources = ["gmail", "crawled", "rss"] as const;
