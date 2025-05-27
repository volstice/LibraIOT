// auth-handler.js
import { auth, onAuthStateChanged, signOut } from './firebase-config.js';

// Wait for DOM to be fully loaded before doing anything
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing auth handler');

    // Get DOM elements
    const userIcon = document.querySelector('.user-icon');
    const userDropdown = document.querySelector('.user-dropdown');
    const mobileMenu = document.querySelector('.mobile-menu');
    const menuToggle = document.querySelector('.menu-toggle-container');

    // Debug output of elements
    console.log('User icon element:', userIcon);
    console.log('User dropdown element:', userDropdown);
    console.log('Mobile menu element:', mobileMenu);
    console.log('Menu toggle element:', menuToggle);

    // Fix for user icon click
    if (userIcon) {
        userIcon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('User icon clicked');

            // Toggle the dropdown
            if (userDropdown) {
                userDropdown.classList.toggle('active');
                console.log('Dropdown toggled, active:', userDropdown.classList.contains('active'));

                // Close mobile menu if open
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    const menuToggleIcon = document.querySelector('.menu-toggle');
                    if (menuToggleIcon) {
                        menuToggleIcon.classList.remove('fa-times');
                        menuToggleIcon.classList.add('fa-bars');
                    }
                }
            }
        });
    } else {
        console.error('User icon not found');
    }

    // Fix for hamburger menu
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu toggle clicked');

            // Toggle the mobile menu
            mobileMenu.classList.toggle('active');
            console.log('Mobile menu toggled, active:', mobileMenu.classList.contains('active'));

            // Toggle the icon
            const iconElement = this.querySelector('.menu-toggle');

            if (iconElement) {
                if (mobileMenu.classList.contains('active')) {
                    iconElement.classList.remove('fa-bars');
                    iconElement.classList.add('fa-times');
                } else {
                    iconElement.classList.remove('fa-times');
                    iconElement.classList.add('fa-bars');
                }
            }

            // Close user dropdown if open
            if (userDropdown && userDropdown.classList.contains('active')) {
                userDropdown.classList.remove('active');
            }
        });
    } else {
        console.error('Hamburger menu or toggle not found');
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        // Close user dropdown when clicking outside
        if (userDropdown && userDropdown.classList.contains('active')) {
            const isClickInsideUserDropdown = userDropdown.contains(e.target) ||
                                            (userIcon && userIcon.contains(e.target));

            if (!isClickInsideUserDropdown) {
                userDropdown.classList.remove('active');
                console.log('Closed user dropdown (clicked outside)');
            }
        }

        // Close mobile menu when clicking outside
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            const isClickInsideMobileMenu = mobileMenu.contains(e.target) ||
                                           (menuToggle && menuToggle.contains(e.target));

            if (!isClickInsideMobileMenu) {
                mobileMenu.classList.remove('active');
                console.log('Closed mobile menu (clicked outside)');

                const menuToggleIcon = document.querySelector('.menu-toggle');
                if (menuToggleIcon) {
                    menuToggleIcon.classList.remove('fa-times');
                    menuToggleIcon.classList.add('fa-bars');
                }
            }
        }
    });

    // Listen for authentication state changes
    console.log('Setting up auth state listener');
    onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user ? `User signed in: ${user.email}` : 'User signed out');
        updateUserDropdown(user);
        updateMobileMenu(user);
    });
});

// Update the user dropdown based on authentication state
function updateUserDropdown(user) {
    console.log('Updating user dropdown with user:', user ? user.email : 'no user');

    const userDropdown = document.querySelector('.user-dropdown');
    if (!userDropdown) {
        console.error('User dropdown not found for updating');
        return;
    }

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
        logoutButton.id = 'signOutLink';
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

    console.log('User dropdown updated');
}

// Update the mobile menu based on authentication state
function updateMobileMenu(user) {
    console.log('Updating mobile menu with user:', user ? user.email : 'no user');

    const mobileMenuExtras = document.querySelector('.mobile-menu-extras');
    if (!mobileMenuExtras) {
        console.error('Mobile menu extras not found for updating');
        return;
    }

    // Look for existing authentication links
    const existingSignOutLink = mobileMenuExtras.querySelector('a[href="#signout"]');
    const existingSignInLink = mobileMenuExtras.querySelector('a[href="signin.html"]');
    const existingSignUpLink = mobileMenuExtras.querySelector('a[href="signup.html"]');

    if (user) {
        // User is signed in

        // Add sign out link if it doesn't exist
        if (!existingSignOutLink) {
            const signOutLink = document.createElement('a');
            signOutLink.href = "#signout";
            signOutLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
            signOutLink.addEventListener('click', handleSignOut);
            mobileMenuExtras.appendChild(signOutLink);
        }

        // Remove sign in/up links if they exist
        if (existingSignInLink) mobileMenuExtras.removeChild(existingSignInLink);
        if (existingSignUpLink) mobileMenuExtras.removeChild(existingSignUpLink);
    } else {
        // User is not signed in

        // Remove sign out link if it exists
        if (existingSignOutLink) mobileMenuExtras.removeChild(existingSignOutLink);

        // Add sign in link if it doesn't exist
        if (!existingSignInLink) {
            const signInLink = document.createElement('a');
            signInLink.href = "signin.html";
            signInLink.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            mobileMenuExtras.appendChild(signInLink);
        }

        // Add sign up link if it doesn't exist
        if (!existingSignUpLink) {
            const signUpLink = document.createElement('a');
            signUpLink.href = "signup.html";
            signUpLink.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
            mobileMenuExtras.appendChild(signUpLink);
        }
    }

    console.log('Mobile menu updated');
}

// Sign out function
async function handleSignOut(e) {
    e.preventDefault();
    console.log('Sign out initiated');

    try {
        await signOut(auth);
        showMessage('You have been signed out successfully');

        // Close the dropdown and mobile menu
        const userDropdown = document.querySelector('.user-dropdown');
        const mobileMenu = document.querySelector('.mobile-menu');

        if (userDropdown && userDropdown.classList.contains('active')) {
            userDropdown.classList.remove('active');
        }

        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            const menuToggle = document.querySelector('.menu-toggle');
            if (menuToggle) {
                menuToggle.classList.remove('fa-times');
                menuToggle.classList.add('fa-bars');
            }
        }

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
    console.log(`Showing message: ${message}, isError: ${isError}`);

    // Create status message element if it doesn't exist
    let statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) {
        statusMessage = document.createElement('div');
        statusMessage.id = 'statusMessage';
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

    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'rgba(255, 50, 50, 0.8)' : '#0ff';

    // Clear message after 5 seconds
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 5000);
}