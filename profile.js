// profile.js
import {
  auth,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser,
  getUserData,
  createUserData,
  updateUserData,
  deleteUserData
} from './firebase-config.js';

// DOM elements
const sidebarUsername = document.getElementById('sidebar-username');
const sidebarEmail = document.getElementById('sidebar-email');
const personalForm = document.getElementById('personal-form');
const libraryForm = document.getElementById('library-form');
const preferencesForm = document.getElementById('preferences-form');
const passwordForm = document.getElementById('password-form');
const deleteForm = document.getElementById('delete-form');

// Navigation elements
const profileNavLinks = document.querySelectorAll('.profile-nav a');
const profileSections = document.querySelectorAll('.profile-section');

// Edit buttons
const editPersonalBtn = document.getElementById('edit-personal');
const editLibraryBtn = document.getElementById('edit-library');
const editPreferencesBtn = document.getElementById('edit-preferences');

// Cancel buttons
const cancelPersonalBtn = document.getElementById('cancel-personal');
const cancelLibraryBtn = document.getElementById('cancel-library');
const cancelPreferencesBtn = document.getElementById('cancel-preferences');

// Modal elements
const changePasswordBtn = document.getElementById('change-password');
const deleteAccountBtn = document.getElementById('delete-account');
const passwordModal = document.getElementById('password-modal');
const deleteModal = document.getElementById('delete-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');

// Current user data
let currentUser = null;
let userData = null;

// Wait for authentication state to change
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    // Update sidebar with user info
    sidebarUsername.textContent = user.displayName || 'User';
    sidebarEmail.textContent = user.email;

    // Load user data from Firestore
    loadUserData(user.uid);
  } else {
    // User is not logged in, redirect to signin page
    window.location.href = '/signin.html';
  }
});

// Load user data from Firestore
async function loadUserData(userId) {
  try {
    showLoadingState(true);

    const data = await getUserData(userId);

    if (data) {
      userData = data;
      populateUserData(userData);
      showNotification('Profile data loaded successfully', 'success');
    } else {
      // Create default user document if it doesn't exist
      await createDefaultUserData(userId);
      showNotification('Welcome! Your profile has been created', 'success');
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    showNotification('Failed to load profile data', 'error');
  } finally {
    showLoadingState(false);
  }
}

// Create default user data
async function createDefaultUserData(userId) {
  const defaultData = {
    personal: {
      fullName: currentUser.displayName || '',
      displayName: currentUser.displayName || '',
      gender: '',
      dob: '',
      phone: '',
      email: currentUser.email,
      address: ''
    },
    library: {
      membershipId: `LIB-${Math.floor(Math.random() * 900000) + 100000}`,
      memberSince: new Date().toISOString().split('T')[0],
      membershipType: 'standard',
      membershipExpiry: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      readingInterests: ''
    },
    preferences: {
      language: 'english',
      notifications: 'all',
      emailUpdates: true,
      newReleases: true,
      returnReminders: true,
      recommendations: true
    }
  };

  try {
    userData = await createUserData(userId, defaultData);
    populateUserData(userData);
  } catch (error) {
    console.error('Error creating default user data:', error);
    showNotification('Failed to create profile', 'error');
  }
}

// Populate form fields with user data
function populateUserData(data) {
  // Personal Information
  if (data.personal) {
    document.getElementById('fullName').value = data.personal.fullName || '';
    document.getElementById('displayName').value = data.personal.displayName || '';
    document.getElementById('gender').value = data.personal.gender || '';
    document.getElementById('dob').value = data.personal.dob || '';
    document.getElementById('phone').value = data.personal.phone || '';
    document.getElementById('email').value = data.personal.email || '';
    document.getElementById('address').value = data.personal.address || '';
  }

  // Library Information
  if (data.library) {
    document.getElementById('membershipId').value = data.library.membershipId || '';
    document.getElementById('memberSince').value = data.library.memberSince || '';
    document.getElementById('membershipType').value = data.library.membershipType || '';
    document.getElementById('membershipExpiry').value = data.library.membershipExpiry || '';
    document.getElementById('readingInterests').value = data.library.readingInterests || '';
  }

  // Preferences
  if (data.preferences) {
    document.getElementById('language').value = data.preferences.language || 'english';
    document.getElementById('notifications').value = data.preferences.notifications || 'all';
    document.getElementById('emailUpdates').checked = data.preferences.emailUpdates || false;
    document.getElementById('newReleases').checked = data.preferences.newReleases || false;
    document.getElementById('returnReminders').checked = data.preferences.returnReminders || false;
    document.getElementById('recommendations').checked = data.preferences.recommendations || false;
  }
}

// Enable form editing
function enableFormEditing(formId, show = true) {
  const form = document.getElementById(formId);
  const inputs = form.querySelectorAll('input, select, textarea');
  const actionsDiv = form.querySelector('.form-actions');

  inputs.forEach(input => {
    input.disabled = !show;
  });

  if (actionsDiv) {
    actionsDiv.style.display = show ? 'flex' : 'none';
  }
}

// Save personal information
async function savePersonalInfo(event) {
  event.preventDefault();

  try {
    showLoadingState(true, personalForm);

    const formData = {
      fullName: document.getElementById('fullName').value,
      displayName: document.getElementById('displayName').value,
      gender: document.getElementById('gender').value,
      dob: document.getElementById('dob').value,
      phone: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      address: document.getElementById('address').value
    };

    await updateUserData(currentUser.uid, 'personal', formData);
    userData.personal = formData;

    showNotification('Personal information updated successfully', 'success');
    enableFormEditing('personal-form', false);
  } catch (error) {
    console.error('Error saving personal information:', error);
    showNotification('Failed to update personal information', 'error');
  } finally {
    showLoadingState(false, personalForm);
  }
}

// Save library information
async function saveLibraryInfo(event) {
  event.preventDefault();

  try {
    showLoadingState(true, libraryForm);

    const formData = {
      membershipId: document.getElementById('membershipId').value,
      memberSince: document.getElementById('memberSince').value,
      membershipType: document.getElementById('membershipType').value,
      membershipExpiry: document.getElementById('membershipExpiry').value,
      readingInterests: document.getElementById('readingInterests').value
    };

    await updateUserData(currentUser.uid, 'library', formData);
    userData.library = formData;

    showNotification('Library information updated successfully', 'success');
    enableFormEditing('library-form', false);
  } catch (error) {
    console.error('Error saving library information:', error);
    showNotification('Failed to update library information', 'error');
  } finally {
    showLoadingState(false, libraryForm);
  }
}

// Save preferences
async function savePreferences(event) {
  event.preventDefault();

  try {
    showLoadingState(true, preferencesForm);

    const formData = {
      language: document.getElementById('language').value,
      notifications: document.getElementById('notifications').value,
      emailUpdates: document.getElementById('emailUpdates').checked,
      newReleases: document.getElementById('newReleases').checked,
      returnReminders: document.getElementById('returnReminders').checked,
      recommendations: document.getElementById('recommendations').checked
    };

    await updateUserData(currentUser.uid, 'preferences', formData);
    userData.preferences = formData;

    showNotification('Preferences updated successfully', 'success');
    enableFormEditing('preferences-form', false);
  } catch (error) {
    console.error('Error saving preferences:', error);
    showNotification('Failed to update preferences', 'error');
  } finally {
    showLoadingState(false, preferencesForm);
  }
}

// Change password
async function changePassword(event) {
  event.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Basic validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showNotification('All fields are required', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showNotification('New passwords do not match', 'error');
    return;
  }

  // Check password strength
  if (!isStrongPassword(newPassword)) {
    showNotification('Password does not meet strength requirements', 'error');
    return;
  }

  try {
    showLoadingState(true, passwordForm);

    // Re-authenticate user first
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );

    await reauthenticateWithCredential(currentUser, credential);

    // Update password
    await updatePassword(currentUser, newPassword);

    showNotification('Password changed successfully', 'success');
    closeModal(passwordModal);
    passwordForm.reset();
  } catch (error) {
    console.error('Error changing password:', error);
    if (error.code === 'auth/wrong-password') {
      showNotification('Current password is incorrect', 'error');
    } else {
      showNotification('Failed to change password', 'error');
    }
  } finally {
    showLoadingState(false, passwordForm);
  }
}

// Delete account
async function deleteAccount(event) {
  event.preventDefault();

  const deleteConfirm = document.getElementById('deleteConfirm').value;
  const deletePassword = document.getElementById('deletePassword').value;

  if (deleteConfirm !== 'DELETE') {
    showNotification('Please type DELETE to confirm account deletion', 'error');
    return;
  }

  if (!deletePassword) {
    showNotification('Password is required', 'error');
    return;
  }

  try {
    showLoadingState(true, deleteForm);

    // Re-authenticate user first
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      deletePassword
    );

    await reauthenticateWithCredential(currentUser, credential);

    // Delete user data from Firestore
    await deleteUserData(currentUser.uid);

    // Delete the Firebase Auth user account
    await deleteUser(currentUser);

    showNotification('Account deleted successfully', 'success');

    // Redirect to sign-in page after short delay
    setTimeout(() => {
      window.location.href = '/signin.html';
    }, 2000);
  } catch (error) {
    console.error('Error deleting account:', error);
    if (error.code === 'auth/wrong-password') {
      showNotification('Password is incorrect', 'error');
    } else {
      showNotification('Failed to delete account', 'error');
    }
  } finally {
    showLoadingState(false, deleteForm);
  }
}

// Password strength validator
function isStrongPassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
}

// Show/hide loading state
function showLoadingState(isLoading, form = null) {
  if (form) {
    if (isLoading) {
      form.classList.add('form-loading');
    } else {
      form.classList.remove('form-loading');
    }
  } else {
    // Global loading state
    document.body.style.cursor = isLoading ? 'wait' : 'default';
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = `notification ${type} glass-effect`;

  const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';

  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span class="message">${message}</span>
    <button class="close-notification">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(notification);

  // Add event listener to close button
  notification.querySelector('.close-notification').addEventListener('click', () => {
    notification.remove();
  });

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

// Open modal
function openModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Navigation between sections
function navigateToSection(targetId) {
  // Hide all sections
  profileSections.forEach(section => {
    section.classList.remove('active');
  });

  // Show target section
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update active nav link
  profileNavLinks.forEach(link => {
    if (link.getAttribute('href') === `#${targetId}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Initialize event listeners
function initEventListeners() {
  // Form submission handlers
  personalForm.addEventListener('submit', savePersonalInfo);
  libraryForm.addEventListener('submit', saveLibraryInfo);
  preferencesForm.addEventListener('submit', savePreferences);
  passwordForm.addEventListener('submit', changePassword);
  deleteForm.addEventListener('submit', deleteAccount);

  // Edit button handlers
  editPersonalBtn.addEventListener('click', () => enableFormEditing('personal-form', true));
  editLibraryBtn.addEventListener('click', () => enableFormEditing('library-form', true));
  editPreferencesBtn.addEventListener('click', () => enableFormEditing('preferences-form', true));

  // Cancel button handlers
  cancelPersonalBtn.addEventListener('click', () => {
    enableFormEditing('personal-form', false);
    populateUserData(userData); // Reset form to original data
  });

  cancelLibraryBtn.addEventListener('click', () => {
    enableFormEditing('library-form', false);
    populateUserData(userData); // Reset form to original data
  });

  cancelPreferencesBtn.addEventListener('click', () => {
    enableFormEditing('preferences-form', false);
    populateUserData(userData); // Reset form to original data
  });

  // Modal handlers
  changePasswordBtn.addEventListener('click', () => openModal(passwordModal));
  deleteAccountBtn.addEventListener('click', () => openModal(deleteModal));

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      closeModal(modal);
    });
  });

  // Close modal when clicking outside content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Navigation
  profileNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      navigateToSection(targetId);

      // Handle mobile navigation
      if (window.innerWidth < 1024) {
        window.scrollTo({
          top: document.getElementById(targetId).offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Initialize the profile page
function initProfilePage() {
  initEventListeners();

  // Show first section by default
  navigateToSection('personal-info');
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initProfilePage);