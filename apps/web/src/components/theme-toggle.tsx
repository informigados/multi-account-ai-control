"use client";

import { Button } from "@/components/ui/button";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	const isDark = theme === "dark";

	return (
		<Button
			aria-label="Toggle theme"
			variant="outline"
			size="icon"
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{isDark ? (
				<SunMedium className="h-4 w-4" />
			) : (
				<MoonStar className="h-4 w-4" />
			)}
		</Button>
	);
}
