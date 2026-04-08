import type {ReactNode} from "react";
import {Card, CardContent} from "@/components/ui/card";

type StatCardProps = {
    label: string;
    value: string | number;
    hint: string;
    icon: ReactNode;
};

export const StatCard = ({label, value, hint, icon}: StatCardProps) => (
    <Card className="overflow-hidden">
        <CardContent className="flex items-start justify-between p-5">
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <h3 className="mt-2 text-3xl font-semibold">{value}</h3>
                <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">{icon}</div>
        </CardContent>
    </Card>
);
