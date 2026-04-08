import {useEffect, useState} from "react";
import type {Preferences} from "@/types/api";
import {contentFilters, deliveryModes} from "@/lib/constants";
import {parseCommaSeparated, stringifyCommaSeparated} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {Textarea} from "@/components/ui/textarea";

type PreferenceFiltersProps = {
    preferences?: Preferences;
    saving?: boolean;
    onSave: (payload: Partial<Preferences>) => Promise<void>;
    onReset: () => Promise<void>;
};

export const PreferenceFilters = ({preferences, saving, onSave, onReset}: PreferenceFiltersProps) => {
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

    const toggleFilter = (filter: "job_updates" | "news" | "time_date") => {
        setForm((current) => ({
            ...current,
            contentFilters: current.contentFilters.includes(filter)
                ? current.contentFilters.filter((item) => item !== filter)
                : [...current.contentFilters, filter],
        }));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Filters & delivery rules</CardTitle>
                <CardDescription>Choose what should match this subscriber and how often you want to email them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-3 md:grid-cols-3">
                    {contentFilters.map((filter) => {
                        const enabled = form.contentFilters.includes(filter.value);

                        return (
                            <div key={filter.value} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 p-4">
                                <div>
                                    <p className="font-medium">{filter.label}</p>
                                    <p className="text-xs text-muted-foreground">Use this topic when building updates</p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={() => toggleFilter(filter.value)} />
                            </div>
                        );
                    })}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                        <span>Delivery mode</span>
                        <select
                            className="h-11 rounded-xl border border-input bg-background/60 px-3 text-sm"
                            value={form.deliveryMode}
                            onChange={(event) => setForm((current) => ({...current, deliveryMode: event.target.value as Preferences["deliveryMode"]}))}
                        >
                            {deliveryModes.map((mode) => (
                                <option key={mode.value} value={mode.value}>{mode.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="grid gap-2 text-sm">
                        <span>Timezone</span>
                        <Input value={form.timezone} onChange={(event) => setForm((current) => ({...current, timezone: event.target.value}))} />
                    </label>
                </div>

                <label className="grid gap-2 text-sm">
                    <span>Notification schedule (cron)</span>
                    <Input value={form.notificationSchedule} onChange={(event) => setForm((current) => ({...current, notificationSchedule: event.target.value}))} />
                </label>

                <div className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2 text-sm">
                        <span>Jobs in email</span>
                        <Input
                            type="number"
                            min="0"
                            value={form.maxJobsInEmail}
                            onChange={(event) => setForm((current) => ({...current, maxJobsInEmail: event.target.value}))}
                        />
                    </label>
                    <label className="grid gap-2 text-sm">
                        <span>News in email</span>
                        <Input
                            type="number"
                            min="0"
                            value={form.maxNewsInEmail}
                            onChange={(event) => setForm((current) => ({...current, maxNewsInEmail: event.target.value}))}
                        />
                    </label>
                    <label className="grid gap-2 text-sm">
                        <span>Schedule items in email</span>
                        <Input
                            type="number"
                            min="0"
                            value={form.maxTimeDateItemsInEmail}
                            onChange={(event) => setForm((current) => ({...current, maxTimeDateItemsInEmail: event.target.value}))}
                        />
                    </label>
                </div>

                <p className="text-xs text-muted-foreground">
                    Use `0` to include all matching items in the email.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                        <span>Keywords</span>
                        <Textarea value={form.keywords} onChange={(event) => setForm((current) => ({...current, keywords: event.target.value}))} />
                    </label>
                    <label className="grid gap-2 text-sm">
                        <span>Companies</span>
                        <Textarea value={form.companies} onChange={(event) => setForm((current) => ({...current, companies: event.target.value}))} />
                    </label>
                    <label className="grid gap-2 text-sm">
                        <span>Job titles</span>
                        <Textarea value={form.jobTitles} onChange={(event) => setForm((current) => ({...current, jobTitles: event.target.value}))} />
                    </label>
                    <label className="grid gap-2 text-sm">
                        <span>Locations</span>
                        <Textarea value={form.locations} onChange={(event) => setForm((current) => ({...current, locations: event.target.value}))} />
                    </label>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button
                        disabled={saving}
                        onClick={() => onSave({
                            contentFilters: form.contentFilters,
                            deliveryMode: form.deliveryMode,
                            keywords: parseCommaSeparated(form.keywords),
                            companies: parseCommaSeparated(form.companies),
                            jobTitles: parseCommaSeparated(form.jobTitles),
                            locations: parseCommaSeparated(form.locations),
                            notificationSchedule: form.notificationSchedule,
                            timezone: form.timezone,
                            maxJobsInEmail: parseEmailLimit(form.maxJobsInEmail, preferences?.maxJobsInEmail ?? 6),
                            maxNewsInEmail: parseEmailLimit(form.maxNewsInEmail, preferences?.maxNewsInEmail ?? 6),
                            maxTimeDateItemsInEmail: parseEmailLimit(form.maxTimeDateItemsInEmail, preferences?.maxTimeDateItemsInEmail ?? 4),
                        })}
                    >
                        {saving ? "Saving..." : "Save preferences"}
                    </Button>
                    <Button variant="outline" disabled={saving} onClick={onReset}>Reset defaults</Button>
                </div>
            </CardContent>
        </Card>
    );
};
