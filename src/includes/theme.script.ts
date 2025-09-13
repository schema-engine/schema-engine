try {
	const theme = localStorage.getItem('theme');
	document.documentElement.classList.toggle('dark', theme === 'dark');
	console.log('Theme loaded:', theme);
} catch (error) {
	console.error('Error loading theme:', error);
}
