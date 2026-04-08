import type {NewsArticle, Pagination} from "@/types/api";
import {formatDateTime} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";

type NewsFeedProps = {
    articles: NewsArticle[];
    pagination?: Pagination;
    search: string;
    category: string;
    categories: string[];
    loading?: boolean;
    onSearchChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onPageChange: (page: number) => void;
    onRefresh: () => Promise<void>;
    onPullNews: () => Promise<void>;
};

export const NewsFeed = ({
    articles,
    pagination,
    search,
    category,
    categories,
    loading,
    onSearchChange,
    onCategoryChange,
    onPageChange,
    onRefresh,
    onPullNews,
}: NewsFeedProps) => (
    <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>News Feed</CardTitle>
                <CardDescription>Keep tabs on market movement and hiring trends linked to the subscriber's filters.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onRefresh}>Refresh</Button>
                <Button onClick={onPullNews} disabled={loading}>Pull latest news</Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr,1fr]">
                <Input placeholder="Search articles" value={search} onChange={(event) => onSearchChange(event.target.value)} />
                <select className="h-11 rounded-xl border border-input bg-background/60 px-3 text-sm" value={category} onChange={(event) => onCategoryChange(event.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {articles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground lg:col-span-2">
                        No news matched the current filters yet.
                    </div>
                ) : articles.map((article) => (
                    <div key={article.newsArticleId} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge>{article.source}</Badge>
                            {article.category && <Badge variant="secondary">{article.category}</Badge>}
                        </div>
                        <h4 className="mt-3 text-lg font-semibold">{article.title}</h4>
                        <p className="mt-2 text-sm text-muted-foreground">{article.aiSummary || article.description || "No summary available."}</p>
                        <div className="mt-4 flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">{formatDateTime(article.publishedAt || article.createdAt)}</span>
                            <a className="text-sm font-medium text-primary hover:underline" href={article.url} target="_blank" rel="noreferrer">Read article</a>
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
