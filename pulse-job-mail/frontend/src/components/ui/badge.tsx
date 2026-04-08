import {cva, type VariantProps} from "class-variance-authority";
import type {HTMLAttributes} from "react";
import {cn} from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary/15 text-primary",
                secondary: "border-transparent bg-secondary text-secondary-foreground",
                outline: "border-border text-foreground",
                success: "border-transparent bg-emerald-500/15 text-emerald-400",
                warning: "border-transparent bg-amber-500/15 text-amber-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
}

export const Badge = ({className, variant, ...props}: BadgeProps) => (
    <div className={cn(badgeVariants({variant}), className)} {...props} />
);
