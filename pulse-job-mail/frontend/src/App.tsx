import {Navigate, Route, Routes} from "react-router-dom";
import {useSubscriber} from "@/hooks/use-subscriber";
import {DashboardPage} from "@/pages/DashboardPage";
import {GmailCallbackPage} from "@/pages/GmailCallbackPage";
import {HomePage} from "@/pages/HomePage";

export default function App() {
    const {hasSubscriber} = useSubscriber();

    return (
        <Routes>
            <Route path="/" element={hasSubscriber ? <Navigate to="/dashboard" replace /> : <HomePage />} />
            <Route path="/dashboard" element={hasSubscriber ? <DashboardPage /> : <Navigate to="/" replace />} />
            <Route path="/gmail/callback" element={hasSubscriber ? <GmailCallbackPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to={hasSubscriber ? "/dashboard" : "/"} replace />} />
        </Routes>
    );
}
