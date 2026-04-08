import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import {QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "sonner";
import App from "./App";
import "./index.css";
import {queryClient} from "./lib/query-client";
import {ThemeProvider} from "./hooks/use-theme";
import {SubscriberProvider} from "./hooks/use-subscriber";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark" storageKey="pulsejobmail-theme">
                <BrowserRouter>
                    <SubscriberProvider>
                        <App />
                        <Toaster richColors position="top-right" />
                    </SubscriberProvider>
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);
