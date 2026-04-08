import type {GmailAccount} from "@/types/api";
import {formatDateTime} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

type GmailConnectCardProps = {
    accounts: GmailAccount[];
    loading?: boolean;
    onConnect: (isPrimary: boolean) => Promise<void>;
    onSync: () => Promise<void>;
    onPreviewDigest: () => Promise<void>;
    onSetPrimary: (gmailAccountId: string) => Promise<void>;
    onDisconnect: (gmailAccountId: string) => Promise<void>;
};

export const GmailConnectCard = ({
    accounts,
    loading,
    onConnect,
    onSync,
    onPreviewDigest,
    onSetPrimary,
    onDisconnect,
}: GmailConnectCardProps) => (
    <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Gmail Connect</CardTitle>
                <CardDescription>Attach one or more Gmail inboxes, sync them on demand, and preview the digest email.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onConnect(accounts.length === 0)}>Connect Gmail</Button>
                <Button variant="secondary" onClick={onSync} disabled={loading}>Sync now</Button>
                <Button onClick={onPreviewDigest} disabled={loading}>Preview digest</Button>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {accounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No Gmail account connected yet. Connect your primary inbox first so PulseJobMail can start parsing job alerts.
                </div>
            ) : (
                accounts.map((account) => (
                    <div key={account.gmailAccountId} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-medium">{account.email}</h4>
                                    {account.isPrimary && <Badge variant="success">Primary</Badge>}
                                    <Badge variant={account.status === "connected" ? "default" : "warning"}>{account.status}</Badge>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Last sync: {formatDateTime(account.lastSyncAt)} • Labels: {(account.labels || []).join(", ") || "INBOX"}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {!account.isPrimary && (
                                    <Button variant="outline" size="sm" onClick={() => onSetPrimary(account.gmailAccountId)}>
                                        Make primary
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => onDisconnect(account.gmailAccountId)}>
                                    Disconnect
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </CardContent>
    </Card>
);
