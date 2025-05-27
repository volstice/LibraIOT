// Import Firebase modules
import { auth, googleProvider, createUserWithEmailAndPassword, signInWithPopup } from './firebase-config.js';

// DOM Elements
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');
const userIcon = document.querySelector('.user-icon');
const userDropdown = document.querySelector('.user-dropdown');
const statusMessage = document.getElementById('statusMessage');

// Helper function to display status messages
function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'rgba(255, 50, 50, 0.8)' : '#0ff';

    // Clear message after 5 seconds
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 5000);
}

// Enhanced error message handler for Firebase auth errors
function handleAuthError(error) {
    console.error('Authentication error:', error);

    // Map Firebase error codes to user-friendly messages
    const errorMessages = {
        'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/operation-not-allowed': 'This sign-up method is not enabled. Please contact support.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
        'auth/popup-closed-by-user': 'Sign-up was canceled. Please try again.',
        'auth/unauthorized-domain': 'This domain is not authorized for OAuth operations.',
        'auth/popup-blocked': 'Sign-up popup was blocked by your browser. Please enable popups for this site.'
    };

    // Return user-friendly message or a generic one if error code is not in our map
    return errorMessages[error.code] || `Registration failed: ${error.message}`;
}

// Toggle Mobile Menu
menuToggle.addEventListener('click', function(e) {
    e.preventDefault();
    mobileMenu.classList.toggle('active');

    // Close user dropdown if open
    if (userDropdown.classList.contains('active')) {
        userDropdown.classList.remove('active');
    }
});

// Toggle User Dropdown
userIcon.addEventListener('click', function(e) {
    e.preventDefault();
    userDropdown.classList.toggle('active');

    // Close mobile menu if open
    if (mobileMenu.classList.contains('active')) {
        mobileMenu.classList.remove('active');
    }
});

// Close menus when clicking outside
document.addEventListener('click', function(e) {
    const isClickInside = mobileMenu.contains(e.target) ||
                        menuToggle.contains(e.target) ||
                        userDropdown.contains(e.target) ||
                        userIcon.contains(e.target);

    if (!isClickInside) {
        mobileMenu.classList.remove('active');
        userDropdown.classList.remove('active');
    }
});

// Input validation functions
function validateEmail(email) {
    // More comprehensive email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    // Check password strength
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.match(/[a-z]+/)) strength += 1;
    if (password.match(/[A-Z]+/)) strength += 1;
    if (password.match(/[0-9]+/)) strength += 1;
    if (password.match(/[^a-zA-Z0-9]+/)) strength += 1;

    return {
        isValid: password.length >= 6,
        strength: strength,
        message: getPasswordStrengthMessage(strength)
    };
}

function getPasswordStrengthMessage(strength) {
    switch(strength) {
        case 0:
        case 1:
            return 'Very weak password';
        case 2:
            return 'Weak password';
        case 3:
            return 'Medium strength password';
        case 4:
            return 'Strong password';
        case 5:
            return 'Very strong password';
        default:
            return '';
    }
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

// Add password strength indicator
function createPasswordStrengthIndicator() {
    const passwordInput = document.getElementById('password');
    const passwordContainer = passwordInput.parentElement.parentElement;

    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';
    strengthIndicator.style.marginTop = '4px';
    strengthIndicator.style.marginBottom = '8px';
    strengthIndicator.style.display = 'none';

    const strengthBar = document.createElement('div');
    strengthBar.className = 'strength-bar';
    strengthBar.style.height = '4px';
    strengthBar.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    strengthBar.style.borderRadius = '2px';
    strengthBar.style.overflow = 'hidden';
    strengthBar.style.marginBottom = '4px';

    const strengthFill = document.createElement('div');
    strengthFill.className = 'strength-fill';
    strengthFill.style.height = '100%';
    strengthFill.style.width = '0%';
    strengthFill.style.backgroundColor = '#0ff';
    strengthFill.style.borderRadius = '2px';
    strengthFill.style.transition = 'width 0.3s ease, background-color 0.3s ease';

    const strengthText = document.createElement('div');
    strengthText.className = 'strength-text';
    strengthText.style.fontSize = '0.8rem';
    strengthText.style.color = 'rgba(255, 255, 255, 0.7)';

    strengthBar.appendChild(strengthFill);
    strengthIndicator.appendChild(strengthBar);
    strengthIndicator.appendChild(strengthText);

    passwordContainer.appendChild(strengthIndicator);

    return {
        container: strengthIndicator,
        bar: strengthFill,
        text: strengthText
    };
}

// Password visibility toggle


// Form submission with Firebase authentication
const authForm = document.getElementById('signupForm');
let passwordStrength;

document.addEventListener('DOMContentLoaded', function() {
    // Create password strength indicator
    passwordStrength = createPasswordStrengthIndicator();

    // Add password visibility toggles
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        addPasswordVisibilityToggle(input);
    });

    // Animate auth container
    const authContainer = document.querySelector('.auth-container');
    setTimeout(() => {
        authContainer.style.opacity = '1';
        authContainer.style.transform = 'translateY(0)';
    }, 100);
});

const passwordInput = document.getElementById('password');
passwordInput.addEventListener('input', function() {
    const result = validatePassword(this.value);

    // Show strength indicator when user starts typing
    passwordStrength.container.style.display = 'block';

    // Update strength bar
    const strengthPercentage = (result.strength / 5) * 100;
    passwordStrength.bar.style.width = `${strengthPercentage}%`;

    // Update strength message
    passwordStrength.text.textContent = result.message;

    // Update color based on strength
    if (result.strength <= 1) {
        passwordStrength.bar.style.backgroundColor = '#ff3232'; // Red
    } else if (result.strength <= 3) {
        passwordStrength.bar.style.backgroundColor = '#ffa500'; // Orange
    } else {
        passwordStrength.bar.style.backgroundColor = '#32ff7e'; // Green
    }
});

authForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckbox = document.getElementById('terms');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Clear previous error messages
    const inputs = [nameInput, emailInput, passwordInput, confirmPasswordInput];
    inputs.forEach(input => clearInputError(input));

    // Validate full name
    if (!name) {
        showInputError(nameInput, 'Full name is required');
        return;
    }

    if (name.length < 2) {
        showInputError(nameInput, 'Name is too short');
        return;
    }

    // Validate email
    if (!email) {
        showInputError(emailInput, 'Email address is required');
        return;
    }

    if (!validateEmail(email)) {
        showInputError(emailInput, 'Please enter a valid email address');
        return;
    }

    // Validate password
    if (!password) {
        showInputError(passwordInput, 'Password is required');
        return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        showInputError(passwordInput, 'Password must be at least 6 characters');
        return;
    }

    if (passwordValidation.strength < 3) {
        // Warning but still allow submission
        passwordStrength.text.style.color = '#ffa500';
    }

    // Validate password confirmation
    if (!confirmPassword) {
        showInputError(confirmPasswordInput, 'Please confirm your password');
        return;
    }

    if (password !== confirmPassword) {
        showInputError(confirmPasswordInput, 'Passwords do not match');
        return;
    }

    // Terms checkbox validation
    if (!termsCheckbox.checked) {
        showMessage('Please agree to the Terms of Service and Privacy Policy', true);
        return;
    }

    // Disable submit button to prevent multiple submissions
    const submitButton = document.querySelector('.auth-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';

    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User created:', user);

        // Clear form and show success message
        authForm.reset();
        showMessage('Account created successfully! Redirecting to sign in page...');

        // Store additional user data (like name) if needed
        console.log('Additional user data to store:', { uid: user.uid, name, email });

        // Hide password strength indicator
        passwordStrength.container.style.display = 'none';

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 2000);

    } catch (error) {
        console.error('Error creating user:', error);

        // Handle specific error cases with user-friendly messages
        const errorMessage = handleAuthError(error);
        showMessage(errorMessage, true);

        // Show field-specific errors
        if (error.code === 'auth/email-already-in-use') {
            showInputError(emailInput, 'This email is already registered');
        } else if (error.code === 'auth/invalid-email') {
            showInputError(emailInput, 'Invalid email format');
        } else if (error.code === 'auth/weak-password') {
            showInputError(passwordInput, 'Password is too weak');
        }
    } finally {
        // Re-enable the button regardless of outcome
        submitButton.disabled = false;
        submitButton.textContent = 'Create Account';
    }
});

// Google Sign In
document.getElementById('googleSignIn').addEventListener('click', async function(e) {
    e.preventDefault();

    // Disable button to prevent multiple clicks
    this.disabled = true;
    const originalText = this.querySelector('span').textContent;
    this.querySelector('span').textContent = 'Connecting...';

    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        console.log('Google sign-in successful:', user);
        showMessage('Google sign-in successful! Redirecting...');

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 2000);

    } catch (error) {
        console.error('Google sign-in error:', error);

        const errorMessage = handleAuthError(error);
        showMessage(errorMessage, true);
    } finally {
        // Re-enable button
        this.disabled = false;
        this.querySelector('span').textContent = originalText;
    }
});

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

// Enhanced password match validation in real-time
const passwordInputs = document.querySelectorAll('input[type="password"]');
const confirmPasswordInput = passwordInputs[1];

confirmPasswordInput.addEventListener('input', function() {
    const password = passwordInputs[0].value;

    if (this.value && password) {
        clearInputError(this);

        if (this.value !== password) {
            this.parentElement.style.borderColor = 'rgba(255, 50, 50, 0.8)';
            showInputError(this, 'Passwords do not match');
        } else {
            this.parentElement.style.borderColor = 'rgba(50, 255, 50, 0.8)';
            clearInputError(this);

            let matchMessage = this.parentElement.nextElementSibling;
            if (!matchMessage || !matchMessage.classList.contains('input-error')) {
                matchMessage = document.createElement('div');
                matchMessage.classList.add('input-error');
                matchMessage.style.color = 'rgba(50, 255, 50, 0.8)';
                matchMessage.style.fontSize = '0.8rem';
                matchMessage.style.marginTop = '4px';
                matchMessage.style.marginBottom = '8px';
                this.parentElement.parentNode.insertBefore(matchMessage, this.parentElement.nextSibling);
            }

            matchMessage.textContent = 'Passwords match';
            matchMessage.style.color = 'rgba(50, 255, 50, 0.8)';
        }
    }
});