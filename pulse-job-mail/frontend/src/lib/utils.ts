import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const formatDateTime = (value?: string | Date | null) => {
    if (!value) {
        return "Not available";
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

export const formatCompactNumber = (value?: number) => {
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(value || 0);
};

export const getInitials = (value?: string | null) => {
    if (!value) {
        return "PJ";
    }

    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase() || "")
        .join("") || "PJ";
};

export const parseCommaSeparated = (value: string) => {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
};

export const stringifyCommaSeparated = (values?: string[]) => {
    return (values || []).join(", ");
};
