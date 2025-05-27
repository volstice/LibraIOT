// route-protector.js
import { auth, onAuthStateChanged } from './firebase-config.js';

// Get the current page path
const currentPath = window.location.pathname.split('/').pop();

// List of pages that require authentication
const protectedPages = [
    'profile.html',
    'saved.html',
    'settings.html',
    'dashboard.html'
];

// List of pages that should redirect if already authenticated
const authPages = [
    'signin.html',
    'signup.html'
];

// Check if current page is protected
const isProtected = protectedPages.includes(currentPath);
const isAuthPage = authPages.includes(currentPath);

// Initialize auth state check
document.addEventListener('DOMContentLoaded', function() {
    onAuthStateChanged(auth, (user) => {
        if (isProtected && !user) {
            // If on protected page and not logged in, redirect to sign in
            console.log('Unauthorized access to protected page');
            window.location.href = 'signin.html?redirect=' + encodeURIComponent(currentPath);
        } else if (isAuthPage && user) {
            // If on auth page and already logged in, redirect to home
            console.log('Already authenticated, redirecting to home');
            // Check if there's a redirect parameter
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect');
            window.location.href = redirectTo || 'main.html';
        }
    });
});

// Export a function to check if a user should have access to a specific feature
export const checkAccess = (callback) => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            callback(true);
        } else {
            callback(false);
        }
    });
};