import type {JobAlert, Pagination} from "@/types/api";
import {jobSources, jobStatuses} from "@/lib/constants";
import {formatDateTime} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";

type JobListProps = {
    jobs: JobAlert[];
    pagination?: Pagination;
    search: string;
    status: string;
    source: string;
    loading?: boolean;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onSourceChange: (value: string) => void;
    onPageChange: (page: number) => void;
    onRefresh: () => Promise<void>;
    onCrawl: () => Promise<void>;
    onUpdateStatus: (jobId: string, status: string) => Promise<void>;
};

export const JobList = ({
    jobs,
    pagination,
    search,
    status,
    source,
    loading,
    onSearchChange,
    onStatusChange,
    onSourceChange,
    onPageChange,
    onRefresh,
    onCrawl,
    onUpdateStatus,
}: JobListProps) => (
    <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Job Inbox</CardTitle>
                <CardDescription>Track preference-matched roles that can be included in subscriber emails.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onRefresh}>Refresh</Button>
                <Button onClick={onCrawl} disabled={loading}>Run crawler</Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr,1fr,1fr]">
                <Input placeholder="Search title, company, description" value={search} onChange={(event) => onSearchChange(event.target.value)} />
                <select className="h-11 rounded-xl border border-input bg-background/60 px-3 text-sm" value={status} onChange={(event) => onStatusChange(event.target.value)}>
                    <option value="">All statuses</option>
                    {jobStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select className="h-11 rounded-xl border border-input bg-background/60 px-3 text-sm" value={source} onChange={(event) => onSourceChange(event.target.value)}>
                    <option value="">All sources</option>
                    {jobSources.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>

            <div className="grid gap-3">
                {jobs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                        No jobs match the current filters yet.
                    </div>
                ) : jobs.map((job) => (
                    <div key={job.jobAlertId} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="text-lg font-semibold">{job.title}</h4>
                                    <Badge>{job.source}</Badge>
                                    <Badge variant={job.status === "applied" ? "success" : job.status === "archived" ? "secondary" : "outline"}>{job.status}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{job.company} {job.location ? `• ${job.location}` : ""}</p>
                                <p className="text-sm text-muted-foreground">{job.aiSummary || job.description || "No summary available."}</p>
                                <p className="text-xs text-muted-foreground">Posted: {formatDateTime(job.postedAt || job.emailReceivedAt || job.createdAt)}</p>
                                {job.url && <a className="text-sm font-medium text-primary hover:underline" href={job.url} target="_blank" rel="noreferrer">Open listing</a>}
                            </div>

                            <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
                                {jobStatuses.map((item) => (
                                    <Button key={item} size="sm" variant={job.status === item ? "default" : "outline"} onClick={() => onUpdateStatus(job.jobAlertId, item)}>
                                        {item}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {pagination?.page || 1} of {pagination?.totalPages || 1}</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!pagination || pagination.page <= 1} onClick={() => onPageChange((pagination?.page || 1) - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={!pagination || pagination.page >= pagination.totalPages} onClick={() => onPageChange((pagination?.page || 1) + 1)}>Next</Button>
                </div>
            </div>
        </CardContent>
    </Card>
);
