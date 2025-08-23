import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
	const [theme, setTheme] = useState<Theme>('light');

	/**
	 * Initialize theme from localStorage or system preference
	 */
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const savedTheme = localStorage.getItem('theme') as Theme | null;
		const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
		const initialTheme = savedTheme || systemTheme;

		setThemeInternal(initialTheme);
	}, []);

	/**
	 * Set the current theme and persist to localStorage
	 */
	const setThemeInternal = (newTheme: Theme) => {
		setTheme(newTheme);
		localStorage.setItem('theme', newTheme);
		document.documentElement.classList.toggle('dark', newTheme === 'dark');
	};

	/**
	 * Toggle between light and dark themes
	 */
	const toggleTheme = () => {
		const newTheme = theme === 'light' ? 'dark' : 'light';
		setThemeInternal(newTheme);
	};

	const isDark = theme === 'dark';
	const isLight = theme === 'light';

	return {
		theme,
		setTheme: setThemeInternal,
		toggleTheme,
		isDark,
		isLight,
	};
}
