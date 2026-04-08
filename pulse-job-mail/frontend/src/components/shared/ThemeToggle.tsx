import {MoonStar, SunMedium} from "lucide-react";
import {useTheme} from "@/hooks/use-theme";
import {Button} from "@/components/ui/button";

export const ThemeToggle = () => {
    const {theme, toggleTheme} = useTheme();

    return (
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>
    );
};
