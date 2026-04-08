import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export const ThemeProvider = ({children, defaultTheme = "dark", storageKey = "theme"}: ThemeProviderProps) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem(storageKey) as Theme | null;
        return storedTheme || defaultTheme;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem(storageKey, theme);
    }, [storageKey, theme]);

    const value = useMemo<ThemeProviderState>(() => ({
        theme,
        setTheme: (nextTheme) => setThemeState(nextTheme),
        toggleTheme: () => setThemeState((currentTheme) => currentTheme === "dark" ? "light" : "dark"),
    }), [theme]);

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};
