// Import Firebase modules
import { auth, googleProvider, signInWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js';

// DOM Elements
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const userIcon = document.querySelector('.user-icon');
const userDropdown = document.querySelector('.user-dropdown');

// Update the user dropdown based on authentication state
function updateUserDropdown(user) {
    if (!userDropdown) return;

    // Clear current dropdown content
    userDropdown.innerHTML = '';

    // Create header
    const header = document.createElement('div');
    header.className = 'dropdown-header';
    header.innerHTML = '<i class="fas fa-user-circle"></i><span>Account</span>';
    userDropdown.appendChild(header);

    // Add divider
    const divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    userDropdown.appendChild(divider);

    if (user) {
        // User is signed in, show authenticated options
        const userEmail = document.createElement('div');
        userEmail.className = 'dropdown-user-info';
        userEmail.textContent = user.email;
        userEmail.style.padding = '10px';
        userEmail.style.fontSize = '0.9rem';
        userEmail.style.opacity = '0.8';
        userDropdown.appendChild(userEmail);

        // Add profile link
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'dropdown-item';
        profileLink.innerHTML = '<i class="fas fa-id-card"></i> Profile';
        userDropdown.appendChild(profileLink);

        // Add settings link
        const settingsLink = document.createElement('a');
        settingsLink.href = 'settings.html';
        settingsLink.className = 'dropdown-item';
        settingsLink.innerHTML = '<i class="fas fa-cog"></i> Settings';
        userDropdown.appendChild(settingsLink);

        // Add logout button
        const logoutButton = document.createElement('a');
        logoutButton.href = '#';
        logoutButton.className = 'dropdown-item';
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
        logoutButton.addEventListener('click', handleSignOut);
        userDropdown.appendChild(logoutButton);
    } else {
        // User is not signed in, show authentication options
        const signInLink = document.createElement('a');
        signInLink.href = 'signin.html';
        signInLink.className = 'dropdown-item';
        signInLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        userDropdown.appendChild(signInLink);

        const signUpLink = document.createElement('a');
        signUpLink.href = 'signup.html';
        signUpLink.className = 'dropdown-item';
        signUpLink.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        userDropdown.appendChild(signUpLink);
    }
}

// Sign out function
async function handleSignOut(e) {
    e.preventDefault();
    try {
        await signOut(auth);
        showMessage('You have been signed out successfully');
        // Close the dropdown
        userDropdown.classList.remove('active');
        // Redirect to main page
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1500);
    } catch (error) {
        console.error('Error signing out:', error);
        showMessage('Error signing out: ' + error.message, true);
    }
}

// Helper function to display status messages
function showMessage(message, isError = false) {
    // Create status message element if it doesn't exist
    let statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) {
        statusMessage = document.createElement('div');
        statusMessage.id = 'statusMessage';
        statusMessage.style.marginTop = '20px';
        statusMessage.style.fontWeight = '500';
        const container = document.querySelector('.auth-container') || document.querySelector('.navbar');
        if (container) {
            container.appendChild(statusMessage);
        } else {
            // Create a floating message if no container found
            statusMessage.style.position = 'fixed';
            statusMessage.style.top = '100px';
            statusMessage.style.left = '50%';
            statusMessage.style.transform = 'translateX(-50%)';
            statusMessage.style.padding = '10px 20px';
            statusMessage.style.borderRadius = '5px';
            statusMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            statusMessage.style.zIndex = '1000';
            document.body.appendChild(statusMessage);
        }
    }

    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'rgba(255, 50, 50, 0.8)' : '#0ff';

    // Clear message after 5 seconds
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 5000);
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? 'User is signed in' : 'User is signed out');
    updateUserDropdown(user);
});

// Toggle Mobile Menu
if (menuToggle) {
    menuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        mobileMenu.classList.toggle('active');

        // Close user dropdown if open
        if (userDropdown.classList.contains('active')) {
            userDropdown.classList.remove('active');
        }
    });
}

// Toggle User Dropdown
if (userIcon) {
    userIcon.addEventListener('click', function(e) {
        e.preventDefault();
        userDropdown.classList.toggle('active');

        // Close mobile menu if open
        if (mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
        }
    });
}

// Close menus when clicking outside
document.addEventListener('click', function(e) {
    if (mobileMenu && userDropdown) {
        const isClickInside = mobileMenu.contains(e.target) ||
                        (menuToggle && menuToggle.contains(e.target)) ||
                        userDropdown.contains(e.target) ||
                        (userIcon && userIcon.contains(e.target));

        if (!isClickInside) {
            mobileMenu.classList.remove('active');
            userDropdown.classList.remove('active');
        }
    }
});

// Enhanced error message handler for Firebase auth errors
function handleAuthError(error) {
    console.error('Authentication error:', error);

    // Map Firebase error codes to user-friendly messages
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email. Please check your email or sign up.',
        'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/invalid-credential': 'Invalid login credentials. Please check your email and password.',
        'auth/too-many-requests': 'Too many failed login attempts. Please try again later or reset your password.',
        'auth/user-disabled': 'This account has been disabled. Please contact support.',
        'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials.',
        'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
        'auth/popup-closed-by-user': 'Sign-in was canceled. Please try again.',
        'auth/operation-not-allowed': 'This login method is not enabled. Please contact support.',
        'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please enable popups for this site.',
        'auth/unauthorized-domain': 'This domain is not authorized for OAuth operations.'
    };

    // Return user-friendly message or a generic one if error code is not in our map
    return errorMessages[error.code] || `Sign-in failed: ${error.message}`;
}

// Get redirect URL from query parameters
function getRedirectUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect');
    return redirectTo || 'main.html'; // Default to main.html if no redirect specified
}

// Input validation function
function validateEmail(email) {
    // More comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Visual feedback for input errors
function showInputError(inputElement, message) {
    // Add visual indicator to the parent container
    inputElement.parentElement.style.borderColor = 'rgba(255, 50, 50, 0.8)';

    // Create or update error message below the input
    let errorElement = inputElement.parentElement.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('input-error')) {
        errorElement = document.createElement('div');
        errorElement.classList.add('input-error');
        errorElement.style.color = 'rgba(255, 50, 50, 0.8)';
        errorElement.style.fontSize = '0.8rem';
        errorElement.style.marginTop = '4px';
        errorElement.style.marginBottom = '8px';
        inputElement.parentElement.parentNode.insertBefore(errorElement, inputElement.parentElement.nextSibling);
    }

    errorElement.textContent = message;

    return false;
}

// Clear input error
function clearInputError(inputElement) {
    inputElement.parentElement.style.borderColor = '';

    let errorElement = inputElement.parentElement.nextElementSibling;
    if (errorElement && errorElement.classList.contains('input-error')) {
        errorElement.textContent = '';
    }
}

// Rate limiting for login attempts
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
let lockoutTimer = null;

function checkRateLimit() {
    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        if (!lockoutTimer) {
            const LOCKOUT_TIME = 5 * 60 * 1000; // 5 minutes
            showMessage(`Too many failed login attempts. Please try again in 5 minutes.`, true);

            // Disable the login button
            const loginButton = document.querySelector('.auth-button');
            loginButton.disabled = true;
            loginButton.style.opacity = '0.5';

            lockoutTimer = setTimeout(() => {
                loginButton.disabled = false;
                loginButton.style.opacity = '1';
                loginAttempts = 0;
                lockoutTimer = null;
                showMessage('You can now attempt to log in again.');
            }, LOCKOUT_TIME);
        }
        return false;
    }
    return true;
}

// Form submission with Firebase authentication
const authForm = document.querySelector('.auth-form');

if (authForm) {
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Check if user is rate limited
        if (!checkRateLimit()) {
            return;
        }

        const emailInput = document.querySelector('input[type="email"]');
        const passwordInput = document.querySelector('input[type="password"]');

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Clear previous error messages
        clearInputError(emailInput);
        clearInputError(passwordInput);

        // Basic validation
        if (!email) {
            showInputError(emailInput, 'Email is required');
            return;
        }

        if (!password) {
            showInputError(passwordInput, 'Password is required');
            return;
        }

        // Email validation
        if (!validateEmail(email)) {
            showInputError(emailInput, 'Please enter a valid email address');
            return;
        }

        // Disable the submit button to prevent multiple submissions
        const submitButton = document.querySelector('.auth-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Signing in...';

        try {
            // Sign in with email and password
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('User signed in:', user);

            // Reset login attempts on success
            loginAttempts = 0;

            // Clear form and show success message
            authForm.reset();
            showMessage('Sign in successful! Redirecting...');

            // Get redirect URL and navigate after a short delay
            const redirectUrl = getRedirectUrl();
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 2000);

        } catch (error) {
            console.error('Error signing in:', error);

            // Increment login attempts for rate limiting
            loginAttempts++;

            // Get user-friendly error message
            const errorMessage = handleAuthError(error);
            showMessage(errorMessage, true);

            // Input-specific error indicators
            if (error.code === 'auth/invalid-email') {
                showInputError(emailInput, 'Invalid email format');
            } else if (error.code === 'auth/user-not-found') {
                showInputError(emailInput, 'No account with this email');
            } else if (error.code === 'auth/wrong-password') {
                showInputError(passwordInput, 'Incorrect password');
            }
        } finally {
            // Re-enable the button regardless of outcome
            submitButton.disabled = false;
            submitButton.textContent = 'Sign In';
        }
    });
}

// Google Sign In
const googleButton = document.querySelector('.social-button.google');
if (googleButton) {
    googleButton.addEventListener('click', async function(e) {
        e.preventDefault();

        // Disable the button to prevent multiple clicks
        this.disabled = true;
        const originalText = this.querySelector('span').textContent;
        this.querySelector('span').textContent = 'Signing in...';

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            console.log('Google sign-in successful:', user);
            showMessage('Google sign-in successful! Redirecting...');

            // Reset login attempts on success
            loginAttempts = 0;

            // Get redirect URL and navigate after a short delay
            const redirectUrl = getRedirectUrl();
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 2000);

        } catch (error) {
            console.error('Google sign-in error:', error);
            const errorMessage = handleAuthError(error);
            showMessage(errorMessage, true);

            // Increment login attempts for rate limiting
            if (error.code !== 'auth/popup-closed-by-user') {
                loginAttempts++;
            }
        } finally {
            // Re-enable the button
            this.disabled = false;
            this.querySelector('span').textContent = originalText;
        }
    });
}

// Add visual feedback for form inputs
const formInputs = document.querySelectorAll('.auth-form input');

formInputs.forEach(input => {
    input.addEventListener('focus', function() {
        clearInputError(this);
        this.parentElement.style.borderColor = 'rgba(0, 255, 255, 0.5)';
    });

    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.style.borderColor = '';
        }
    });
});

// Animate the auth container when page loads
document.addEventListener('DOMContentLoaded', function() {
    const authContainer = document.querySelector('.auth-container');
    if (authContainer) {
        setTimeout(() => {
            authContainer.style.opacity = '1';
            authContainer.style.transform = 'translateY(0)';
        }, 100);
    }
});