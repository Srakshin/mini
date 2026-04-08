import {cn} from "@/lib/utils";

type SwitchProps = {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
};

export const Switch = ({checked, onCheckedChange, disabled}: SwitchProps) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
            "relative inline-flex h-7 w-12 items-center rounded-full border border-border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-primary/90" : "bg-secondary",
        )}
    >
        <span
            className={cn(
                "inline-block h-5 w-5 rounded-full bg-white transition-transform",
                checked ? "translate-x-6" : "translate-x-1",
            )}
        />
    </button>
);
