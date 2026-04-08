import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";
import {LandingHero} from "@/components/home/LandingHero";
import {useSubscriber} from "@/hooks/use-subscriber";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const HomePage = () => {
    const navigate = useNavigate();
    const {saveSubscriberEmail} = useSubscriber();
    const [email, setEmail] = useState("");

    const handleContinue = () => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!EMAIL_REGEX.test(normalizedEmail)) {
            toast.error("Enter a valid email address.");
            return;
        }

        saveSubscriberEmail(normalizedEmail);
        toast.success("Email saved. You can set preferences now.");
        navigate("/dashboard");
    };

    return (
        <main className="min-h-screen bg-black px-4 py-4 md:px-6 md:py-6">
            <div className="mx-auto max-w-7xl">
                <LandingHero email={email} onContinue={handleContinue} onEmailChange={setEmail} />
            </div>
        </main>
    );
};
