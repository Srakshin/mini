import {Link, useSearchParams} from "react-router-dom";
import {CheckCircle2, MailWarning} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export const GmailCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const success = searchParams.get("success") === "true";
    const email = searchParams.get("email");
    const error = searchParams.get("error");

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${success ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                        {success ? <CheckCircle2 className="h-6 w-6" /> : <MailWarning className="h-6 w-6" />}
                    </div>
                    <CardTitle>{success ? "Gmail connected" : "Connection failed"}</CardTitle>
                    <CardDescription>
                        {success ? `PulseJobMail can now sync ${email || "your Gmail inbox"}.` : error || "We couldn't finish the Gmail connection flow."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Link to="/dashboard">
                        <Button className="w-full">Back to dashboard</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
};
