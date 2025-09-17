try {
	const theme = localStorage.getItem('theme');
	document.documentElement.classList.toggle('dark', theme === 'dark');
} catch (error) {
	console.error('Error loading theme:', error);
}
