import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from "react";
import {clearSubscriberEmail, getSubscriberEmail, setSubscriberEmail} from "@/lib/api";

type SubscriberContextValue = {
    subscriberEmail: string | null;
    hasSubscriber: boolean;
    saveSubscriberEmail: (email: string) => void;
    clearSubscriber: () => void;
};

const SubscriberContext = createContext<SubscriberContextValue | undefined>(undefined);

export const SubscriberProvider = ({children}: {children: ReactNode}) => {
    const [subscriberEmailState, setSubscriberEmailState] = useState<string | null>(() => getSubscriberEmail());

    useEffect(() => {
        const syncSubscriber = () => {
            setSubscriberEmailState(getSubscriberEmail());
        };

        window.addEventListener("pulsejobmail:subscriber-changed", syncSubscriber);
        return () => window.removeEventListener("pulsejobmail:subscriber-changed", syncSubscriber);
    }, []);

    const value = useMemo<SubscriberContextValue>(() => ({
        subscriberEmail: subscriberEmailState,
        hasSubscriber: Boolean(subscriberEmailState),
        saveSubscriberEmail: (email: string) => {
            setSubscriberEmail(email);
            setSubscriberEmailState(getSubscriberEmail());
        },
        clearSubscriber: () => {
            clearSubscriberEmail();
            setSubscriberEmailState(null);
        },
    }), [subscriberEmailState]);

    return (
        <SubscriberContext.Provider value={value}>
            {children}
        </SubscriberContext.Provider>
    );
};

export const useSubscriber = () => {
    const context = useContext(SubscriberContext);

    if (!context) {
        throw new Error("useSubscriber must be used within a SubscriberProvider");
    }

    return context;
};
