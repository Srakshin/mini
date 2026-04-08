import type {ReactNode} from "react";
import {BriefcaseBusiness, Newspaper, RefreshCcw} from "lucide-react";
import {NavLink} from "react-router-dom";
import {useSubscriber} from "@/hooks/use-subscriber";
import {getInitials} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {ThemeToggle} from "@/components/shared/ThemeToggle";

export const AppShell = ({children}: {children: ReactNode}) => {
    const {subscriberEmail, clearSubscriber} = useSubscriber();

    return (
        <div className="min-h-screen">
            <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                            <BriefcaseBusiness className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold tracking-[0.25em] text-primary">PULSEJOBMAIL</p>
                            <p className="text-xs text-muted-foreground">Inbox-driven hiring intelligence</p>
                        </div>
                    </div>

                    <nav className="hidden items-center gap-2 md:flex">
                        <NavLink
                            to="/dashboard"
                            className={({isActive}) => `rounded-xl px-4 py-2 text-sm ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Newspaper className="h-4 w-4" />
                                Dashboard
                            </span>
                        </NavLink>
                    </nav>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <div className="hidden rounded-2xl border border-border/70 bg-card/80 px-3 py-2 sm:block">
                            <p className="text-sm font-medium">{subscriberEmail || "Subscriber"}</p>
                            <p className="text-xs text-muted-foreground">Email-based delivery</p>
                        </div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary font-semibold">
                            {getInitials(subscriberEmail || "Subscriber")}
                        </div>
                        <Button variant="ghost" size="icon" onClick={clearSubscriber} aria-label="Change email">
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
};
