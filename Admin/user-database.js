// Import Firebase utilities
import {addDoc, collection, db, deleteDoc, doc, getDoc, getDocs, updateDoc} from './firebase-config.js';

// Protect the route to ensure only authenticated users can access
document.addEventListener('DOMContentLoaded', () => {
    // Uncomment the following line when you want to enable authentication protection
    // if (!protectRoute()) return;

    // Initialize the User Database module
    initUserDatabase();
});

// State variables
let users = [];
let filteredUsers = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentUser = null;
let selectedUsers = new Set();

// Initialize User Database module
function initUserDatabase() {
    // Load initial users data
    loadUsers();

    // Initialize event listeners
    initEventListeners();
}

// Load users from Firestore database
async function loadUsers() {
    try {
        showLoading(true);

        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        // Reset users array
        users = [];

        // Process each document
        snapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                ...userData,
                rfid: userData.rfid || '',
                // Ensure library data is available or provide default values
                library: userData.library || {
                    membershipId: '',
                    membershipType: 'standard',
                    membershipSince: '',
                    membershipExpiry: '',
                    readingInterests: []
                },
                // Ensure personal data is available or provide default values
                personal: userData.personal || {
                    fullName: userData.displayName || '',
                    displayName: userData.displayName || '',
                    email: userData.email || '',
                    phone: '',
                    gender: '',
                    dob: '',
                    address: ''
                },
                // Ensure preferences data is available or provide default values
                preferences: userData.preferences || {
                    language: 'english',
                    emailUpdates: false,
                    newReleases: false,
                    returnReminders: false,
                    recommendations: false,
                    notifications: 'all'
                }
            });
        });

        // Apply initial filtering based on the selected membership type
        filterUsers();

        // Render the users table
        renderUsersTable();

        showLoading(false);
    } catch (error) {
        console.error("Error loading users:", error);
        showToast("Error loading users data. Please try again.", "error");
        showLoading(false);
    }
}

// Initialize all event listeners
function initEventListeners() {
    // Search and filter controls
    document.getElementById('searchButton').addEventListener('click', handleSearch);
    document.getElementById('searchUser').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('filterMembership').addEventListener('change', filterUsers);

    // Pagination controls
    document.getElementById('prevPage').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(currentPage + 1));
    document.getElementById('itemsPerPage').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1; // Reset to first page when changing items per page
        renderUsersTable();
    });

    // Bulk selection controls
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);

    // Add user button
    document.getElementById('addUserButton').addEventListener('click', () => openAddUserModal());

    // User form save button
    document.getElementById('saveUserButton').addEventListener('click', saveUserData);

    // Modal close buttons
    document.querySelectorAll('.modal .close, #cancelButton, #closeViewButton').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Delete confirmation
    document.getElementById('confirmDeleteButton').addEventListener('click', confirmDeleteUser);
    document.getElementById('cancelDeleteButton').addEventListener('click', closeAllModals);

    // Edit from view
    document.getElementById('editFromViewButton').addEventListener('click', () => {
        openEditUserModal(currentUser);
        closeModal('viewUserModal');

    });
    // RFID Modal buttons
    document.getElementById('cancelRfidButton').addEventListener('click', closeAllModals);
    document.getElementById('saveRfidButton').addEventListener('click', saveRfidData);

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');
            activateTab(tabName);
        });
    });
}

// Handle search functionality
function handleSearch() {
    const searchTerm = document.getElementById('searchUser').value.trim().toLowerCase();

    if (searchTerm === '') {
        // If search is empty, reset to full filtered list
        filterUsers();
        return;
    }

    // Filter users based on search term
    filteredUsers = users.filter(user => {
        const fullName = user.personal?.fullName?.toLowerCase() || '';
        const email = user.personal?.email?.toLowerCase() || '';
        const membershipId = user.library?.membershipId?.toLowerCase() || '';

        return fullName.includes(searchTerm) ||
            email.includes(searchTerm) ||
            membershipId.includes(searchTerm);
    });

    currentPage = 1; // Reset to first page for search results
    renderUsersTable();
}

// Filter users based on membership type
function filterUsers() {
    const membershipType = document.getElementById('filterMembership').value;

    if (membershipType === 'all') {
        filteredUsers = [...users];
    } else if (membershipType === 'expired') {
        // Filter for expired memberships (where expiry date is in the past)
        filteredUsers = users.filter(user => {
            const expiryDate = user.library?.membershipExpiry;
            if (!expiryDate) return false;

            return new Date(expiryDate) < new Date();
        });
    } else {
        // Filter by specific membership type
        filteredUsers = users.filter(user => user.library?.membershipType === membershipType);
    }

    currentPage = 1; // Reset to first page when filtering
    renderUsersTable();
}

// Toggle select all users on current page
function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('#usersTableBody .user-select-checkbox');

    selectedUsers.clear();

    if (isChecked) {
        // Get users on current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);

        for (let i = startIndex; i < endIndex; i++) {
            selectedUsers.add(filteredUsers[i].id);
        }
    }

    // Update checkbox states
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });

    updateBulkActionsVisibility();
}

// Update bulk actions visibility based on selection
function updateBulkActionsVisibility() {
    // Implementation for bulk actions if needed
    console.log(`${selectedUsers.size} users selected`);
}

// Handle individual user selection
function toggleUserSelection(userId) {
    if (selectedUsers.has(userId)) {
        selectedUsers.delete(userId);
    } else {
        selectedUsers.add(userId);
    }

    // Update select all checkbox state
    updateSelectAllCheckbox();
    updateBulkActionsVisibility();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#usersTableBody .user-select-checkbox');

    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
    const someChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
}

// Add this to your initEventListeners function

// Render users table with current data
function renderUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    const totalUsers = filteredUsers.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalUsers);

    // Clear existing table content
    tableBody.innerHTML = '';

    // Check if there are no users
    if (totalUsers === 0) {
        const noDataRow = document.createElement('tr');
        noDataRow.classList.add('no-data-row');
        noDataRow.innerHTML = `
            <td colspan="8">
                <div class="no-data-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>No users found. Try adjusting your search or filters.</span>
                </div>
            </td>
        `;
        tableBody.appendChild(noDataRow);
    } else {
        // Render user rows
        for (let i = startIndex; i < endIndex; i++) {
            const user = filteredUsers[i];
            const membershipExpiry = user.library?.membershipExpiry ? new Date(user.library.membershipExpiry) : null;
            const isExpired = membershipExpiry ? membershipExpiry < new Date() : false;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="user-select-checkbox" data-user-id="${user.id}" 
                        ${selectedUsers.has(user.id) ? 'checked' : ''}>
                </td>
                <td>${user.library?.membershipId || '-'}</td>
                <td>${user.personal?.fullName || user.personal?.displayName || '-'}</td>
                <td>${user.personal?.email || '-'}</td>
                <td>${user.personal?.phone || '-'}</td>
                <td>
                    <span class="badge ${user.library?.membershipType || 'standard'}">
                        ${(user.library?.membershipType || 'standard').charAt(0).toUpperCase() +
            (user.library?.membershipType || 'standard').slice(1)}
                    </span>
                </td>
                <td>
                    <span class="date-badge ${isExpired ? 'expired' : ''}">
                        ${user.library?.membershipExpiry || 'N/A'}
                        ${isExpired ? '<i class="fas fa-exclamation-circle"></i>' : ''}
                    </span>
                </td>
                <td class="actions-cell">
                    <button class="icon-button view-button" data-user-id="${user.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="icon-button edit-button" data-user-id="${user.id}" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-button qrcode-button" data-user-id="${user.id}" title="Set RFID">
                    <i class="fas fa-qrcode"></i>
                    </button>
                    <button class="icon-button delete-button" data-user-id="${user.id}" title="Delete User">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        }

        // Add event listeners to the newly created buttons
        attachRowEventListeners();
    }

    // Update pagination
    updatePagination(totalUsers);
}

// Attach event listeners to table row elements
function attachRowEventListeners() {
    // Selection checkboxes
    document.querySelectorAll('.user-select-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            toggleUserSelection(userId);
        });
    });

    // View buttons
    document.querySelectorAll('.view-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.closest('.view-button').getAttribute('data-user-id');
            openViewUserModal(userId);
        });
    });

    // Edit buttons
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.closest('.edit-button').getAttribute('data-user-id');
            const user = users.find(user => user.id === userId);
            openEditUserModal(user);
        });
    });

    // QR Code buttons
    document.querySelectorAll('.qrcode-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.closest('.qrcode-button').getAttribute('data-user-id');
            const user = users.find(user => user.id === userId);
            openRfidModal(user);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.closest('.delete-button').getAttribute('data-user-id');
            const user = users.find(user => user.id === userId);
            openDeleteConfirmation(user);
        });
    });
}

// Add this function to open the RFID modal
function openRfidModal(user) {
    if (!user) return;

    currentUser = user;

    // Set user info in the modal
    document.getElementById('rfidUserName').textContent = user.personal?.fullName || user.personal?.displayName || 'Unknown User';
    document.getElementById('rfidMembershipId').textContent = user.library?.membershipId || 'N/A';

    // Set current RFID value if exists
    document.getElementById('rfidInput').value = user.rfid || '';

    // Open modal
    openModal('rfidModal');
}

// Add this function to save RFID data
async function saveRfidData() {
    if (!currentUser) {
        closeAllModals();
        return;
    }

    try {
        const rfidValue = document.getElementById('rfidInput').value.trim();

        // Update in Firestore
        await updateDoc(doc(db, 'users', currentUser.id), {
            rfid: rfidValue
        });

        // Update in local array
        const index = users.findIndex(user => user.id === currentUser.id);
        if (index !== -1) {
            users[index].rfid = rfidValue;
        }

        showToast(`RFID updated successfully for ${currentUser.personal?.fullName || 'user'}.`);
        closeAllModals();

    } catch (error) {
        console.error("Error saving RFID data:", error);
        showToast("Failed to save RFID data. Please try again.", "error");
    }
}

// Update pagination controls
function updatePagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / itemsPerPage);

    // Update info text
    const startItem = totalUsers === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalUsers);
    document.getElementById('paginationInfo').textContent = `Showing ${startItem}-${endItem} of ${totalUsers} users`;

    // Update page buttons
    const paginationNumbers = document.getElementById('paginationNumbers');
    paginationNumbers.innerHTML = '';

    // Create number buttons
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    // Adjust startPage if we have fewer pages than maxPageButtons
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    // First page button if needed
    if (startPage > 1) {
        const firstPageButton = createPageButton(1, currentPage === 1);
        paginationNumbers.appendChild(firstPageButton);

        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationNumbers.appendChild(ellipsis);
        }
    }

    // Number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = createPageButton(i, currentPage === i);
        paginationNumbers.appendChild(pageButton);
    }

    // Last page button if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationNumbers.appendChild(ellipsis);
        }

        const lastPageButton = createPageButton(totalPages, currentPage === totalPages);
        paginationNumbers.appendChild(lastPageButton);
    }

    // Update prev/next buttons
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

// Create a pagination button
function createPageButton(pageNumber, isActive) {
    const button = document.createElement('button');
    button.className = `pagination-number ${isActive ? 'active' : ''}`;
    button.textContent = pageNumber;

    if (!isActive) {
        button.addEventListener('click', () => changePage(pageNumber));
    }

    return button;
}

// Change current page
function changePage(pageNumber) {
    currentPage = pageNumber;
    renderUsersTable();

    // Scroll to top of table
    document.querySelector('.users-table-container').scrollTop = 0;
}

// Show loading state
function showLoading(isLoading) {
    const tableBody = document.getElementById('usersTableBody');

    if (isLoading) {
        tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="8">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Loading users data...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Open the add user modal
function openAddUserModal() {
    // Reset form and prepare for new user
    document.getElementById('userForm').reset();
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Add New User';
    document.getElementById('userId').value = '';
    document.getElementById('membershipId').value = generateMembershipId();

    // Set default dates
    const today = new Date();
    document.getElementById('membershipSince').value = formatDateForInput(today);

    // Set default expiry date (1 year from today)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    document.getElementById('membershipExpiry').value = formatDateForInput(nextYear);

    // Open modal
    openModal('userModal');
}

// Open the edit user modal for existing user
function openEditUserModal(user) {
    if (!user) return;

    currentUser = user;

    // Set form title
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';

    // Populate form with user data
    document.getElementById('userId').value = user.id;
    document.getElementById('fullName').value = user.personal?.fullName || '';
    document.getElementById('displayName').value = user.personal?.displayName || '';
    document.getElementById('email').value = user.personal?.email || '';
    document.getElementById('phone').value = user.personal?.phone || '';
    document.getElementById('gender').value = user.personal?.gender || 'prefer-not-to-say';
    document.getElementById('dob').value = user.personal?.dob || '';
    document.getElementById('address').value = user.personal?.address || '';

    // Library information
    document.getElementById('membershipId').value = user.library?.membershipId || '';
    document.getElementById('membershipType').value = user.library?.membershipType || 'standard';
    document.getElementById('membershipSince').value = user.library?.membershipSince || '';
    document.getElementById('membershipExpiry').value = user.library?.membershipExpiry || '';

    // Handle reading interests (multi-select)
    const readingInterestsSelect = document.getElementById('readingInterests');
    const interests = user.library?.readingInterests || [];

    // Reset all options
    Array.from(readingInterestsSelect.options).forEach(option => {
        option.selected = interests.includes(option.value);
    });

    // Preferences
    document.getElementById('language').value = user.preferences?.language || 'english';
    document.getElementById('emailUpdates').checked = user.preferences?.emailUpdates || false;
    document.getElementById('newReleases').checked = user.preferences?.newReleases || false;
    document.getElementById('returnReminders').checked = user.preferences?.returnReminders || false;
    document.getElementById('recommendations').checked = user.preferences?.recommendations || false;
    document.getElementById('notificationsType').value = user.preferences?.notifications || 'all';

    // Open modal
    openModal('userModal');
}

// Open the view user modal
async function openViewUserModal(userId) {
    try {
        // Get user from state or fetch from database
        let user = users.find(u => u.id === userId);

        if (!user) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                user = {
                    id: userDoc.id,
                    ...userDoc.data()
                };
            } else {
                throw new Error('User not found');
            }
        }

        currentUser = user;

        // Populate user details
        document.getElementById('viewFullName').textContent = user.personal?.fullName || 'N/A';
        document.getElementById('viewMembershipId').textContent = `Membership ID: ${user.library?.membershipId || 'N/A'}`;

        // Set membership status
        const membershipStatus = document.getElementById('viewMembershipStatus');
        const membershipExpiry = user.library?.membershipExpiry ? new Date(user.library.membershipExpiry) : null;
        const isExpired = membershipExpiry ? membershipExpiry < new Date() : false;

        if (isExpired) {
            membershipStatus.textContent = 'Expired';
            membershipStatus.className = 'user-status expired';
        } else {
            membershipStatus.textContent = user.library?.membershipType || 'Standard';
            membershipStatus.className = `user-status ${user.library?.membershipType || 'standard'}`;
        }

        // Personal info
        document.getElementById('viewEmail').textContent = user.personal?.email || 'N/A';
        document.getElementById('viewPhone').textContent = user.personal?.phone || 'N/A';
        document.getElementById('viewAddress').textContent = user.personal?.address || 'N/A';
        document.getElementById('viewDisplayName').textContent = user.personal?.displayName || 'N/A';
        document.getElementById('viewGender').textContent = user.personal?.gender ?
            user.personal.gender.charAt(0).toUpperCase() + user.personal.gender.slice(1) : 'N/A';
        document.getElementById('viewDob').textContent = user.personal?.dob || 'N/A';

        // Library info
        document.getElementById('viewMemberSince').textContent = user.library?.membershipSince || 'N/A';
        document.getElementById('viewExpiryDate').textContent = user.library?.membershipExpiry || 'N/A';
        document.getElementById('viewMembershipType').textContent = user.library?.membershipType ?
            user.library.membershipType.charAt(0).toUpperCase() + user.library.membershipType.slice(1) : 'Standard';

        // Reading interests
        const interestsContainer = document.getElementById('viewReadingInterests');
        interestsContainer.innerHTML = '';

        if (user.library?.readingInterests && user.library.readingInterests.length > 0) {
            user.library.readingInterests.forEach(interest => {
                const tag = document.createElement('span');
                tag.className = 'interest-tag';
                tag.textContent = interest.charAt(0).toUpperCase() + interest.slice(1);
                interestsContainer.appendChild(tag);
            });
        } else {
            interestsContainer.textContent = 'No interests specified';
        }

        // Language and notifications
        document.getElementById('viewLanguage').textContent = user.preferences?.language ?
            user.preferences.language.charAt(0).toUpperCase() + user.preferences.language.slice(1) : 'English';

        // Build notifications text
        let notificationsList = [];
        if (user.preferences?.emailUpdates) notificationsList.push('Email Updates');
        if (user.preferences?.newReleases) notificationsList.push('New Releases');
        if (user.preferences?.returnReminders) notificationsList.push('Return Reminders');
        if (user.preferences?.recommendations) notificationsList.push('Recommendations');

        document.getElementById('viewNotifications').textContent =
            notificationsList.length > 0 ? notificationsList.join(', ') : 'None';

        // Load books and activity data
        // This would require additional Firebase queries in a real app
        // For now we'll just show placeholder messages
        document.getElementById('borrowedBooks').innerHTML = '<p class="no-data-message">No books currently borrowed.</p>';
        document.getElementById('historyBooks').innerHTML = '<p class="no-data-message">No borrowing history available.</p>';
        document.getElementById('favoriteBooks').innerHTML = '<p class="no-data-message">No favorite books added.</p>';
        document.getElementById('activityList').innerHTML = '<p class="no-data-message">No recent activity recorded.</p>';

        // Show first tab by default
        activateTab('info');

        // Open modal
        openModal('viewUserModal');

    } catch (error) {
        console.error("Error opening user view:", error);
        showToast("Could not load user details. Please try again.", "error");
    }
}

// Activate specific tab in view user modal
function activateTab(tabName) {
    // Remove active class from all tab buttons and panels
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Add active class to selected tab and panel
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Open delete confirmation modal
function openDeleteConfirmation(user) {
    if (!user) return;

    currentUser = user;

    // Set user info in confirmation
    document.getElementById('deleteUserName').textContent = user.personal?.fullName || user.personal?.displayName || 'Unknown User';
    document.getElementById('deleteUserMembership').textContent = user.library?.membershipId || 'N/A';

    // Open modal
    openModal('deleteModal');
}

// Confirm user deletion
async function confirmDeleteUser() {
    if (!currentUser) {
        closeAllModals();
        return;
    }

    try {
        // Delete user from Firestore
        await deleteDoc(doc(db, 'users', currentUser.id));

        // Remove from local array
        users = users.filter(user => user.id !== currentUser.id);

        // Re-filter and render
        filterUsers();

        // Show success message
        showToast(`User ${currentUser.personal?.fullName || 'Unknown'} has been deleted successfully.`);

        // Close modal
        closeAllModals();

    } catch (error) {
        console.error("Error deleting user:", error);
        showToast("Failed to delete user. Please try again.", "error");
    }
}

// Save user data (create or update)
async function saveUserData() {
    try {
        const userId = document.getElementById('userId').value;
        const isNewUser = !userId;

        // Get form data
        const userData = {
            personal: {
                fullName: document.getElementById('fullName').value,
                displayName: document.getElementById('displayName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                gender: document.getElementById('gender').value,
                dob: document.getElementById('dob').value,
                address: document.getElementById('address').value
            },
            library: {
                membershipId: document.getElementById('membershipId').value,
                membershipType: document.getElementById('membershipType').value,
                membershipSince: document.getElementById('membershipSince').value,
                membershipExpiry: document.getElementById('membershipExpiry').value,
                readingInterests: Array.from(document.getElementById('readingInterests').selectedOptions).map(option => option.value)
            },
            preferences: {
                language: document.getElementById('language').value,
                emailUpdates: document.getElementById('emailUpdates').checked,
                newReleases: document.getElementById('newReleases').checked,
                returnReminders: document.getElementById('returnReminders').checked,
                recommendations: document.getElementById('recommendations').checked,
                notifications: document.getElementById('notificationsType').value
            }
        };

        if (isNewUser) {
            // Create new user
            const docRef = await addDoc(collection(db, 'users'), userData);
            userData.id = docRef.id;
            users.push(userData);
            showToast("New user created successfully!");
        } else {
            // Preserve the existing RFID value if present
            const existingUser = users.find(user => user.id === userId);
            if (existingUser && existingUser.rfid) {
                userData.rfid = existingUser.rfid;
            }

            // Update existing user
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, userData);

            // Update local array
            const index = users.findIndex(user => user.id === userId);
            if (index !== -1) {
                users[index] = {...users[index], ...userData, id: userId};
            }

            showToast("User updated successfully!");
        }

        // Re-filter and render
        filterUsers();

        // Close modal
        closeAllModals();

    } catch (error) {
        console.error("Error saving user data:", error);
        showToast("Failed to save user data. Please try again.", "error");
    }
}

// Generate a unique membership ID
function generateMembershipId() {
    const prefix = 'LIB-';
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${randomNum}`;
}

// Format date for input fields
function formatDateForInput(date) {
    if (!date) return '';

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.querySelector('.toast-icon');

    // Set message and style
    toastMessage.textContent = message;

    // Set icon based on type
    toastIcon.className = `fas toast-icon ${type === 'error' ? 'fa-exclamation-circle error' : 'fa-check-circle success'}`;

    // Show toast
    toast.classList.add('show');

    // Reset progress bar animation
    const progressBar = document.querySelector('.toast-progress');
    progressBar.style.animation = 'none';
    progressBar.offsetHeight; // Trigger reflow
    progressBar.style.animation = 'progress 3s linear forwards';

    // Auto hide after timeout
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Open a modal by ID
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.classList.add('modal-open');
}

// Close a specific modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.classList.remove('modal-open');
}

