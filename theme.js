const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme');

// Set the initial theme icon based on the current theme
function setInitialIcon() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        themeToggle.textContent = '☀️'; // Sun icon for dark mode
    } else {
        themeToggle.textContent = '🌙'; // Moon icon for light mode
    }
}

// Function to apply a theme
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    setInitialIcon();
}

// Check for saved theme in localStorage
if (currentTheme) {
    applyTheme(currentTheme);
} else {
    // If no theme is saved, check for OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
}

// Add click event listener to the toggle button
themeToggle.addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
});

// Ensure the icon is correct on page load
document.addEventListener('DOMContentLoaded', setInitialIcon);