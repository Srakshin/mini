import {cn} from "@/lib/utils";

export const Separator = ({className}: {className?: string}) => {
    return <div className={cn("h-px w-full bg-border/80", className)} />;
};
