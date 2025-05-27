// manage-tables.js
import {
    auth,
    db,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    onAuthStateChanged,
    protectRoute
} from './firebase-config.js';

// Check if user is authenticated and has admin access
document.addEventListener('DOMContentLoaded', async function() {
    // Protect the route

    // Initialize module
    initTableManagement();
});

// Main initialization function
function initTableManagement() {
    // DOM Elements
    const tablesGrid = document.getElementById('tablesGrid');
    const addTableBtn = document.getElementById('addTableBtn');
    const saveTableBtn = document.getElementById('saveTableBtn');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const assignUserBtn = document.getElementById('assignUserBtn');
    const removeUserBtn = document.getElementById('removeUserBtn');
    const deleteTableBtn = document.getElementById('deleteTableBtn');

    // Modals
    const addTableModal = document.getElementById('addTableModal');
    const tableDetailsModal = document.getElementById('tableDetailsModal');
    const confirmationModal = document.getElementById('confirmationModal');
    const successModal = document.getElementById('successModal');

    // Counter elements
    const totalTablesCounter = document.getElementById('totalTables');
    const occupiedTablesCounter = document.getElementById('occupiedTables');
    const availableTablesCounter = document.getElementById('availableTables');

    const removeBookBtn = document.getElementById('removeBookBtn');
    if (removeBookBtn) {
        removeBookBtn.addEventListener('click', removeBookFromUser);
}



    // Current state variables
    let tables = [];
    let currentTableId = null;
    let currentUserData = null;

    // Load tables on startup
    loadTables();

    // Event Listeners
    addTableBtn.addEventListener('click', openAddTableModal);
    saveTableBtn.addEventListener('click', saveNewTable);
    searchUserBtn.addEventListener('click', searchUser);
    assignUserBtn.addEventListener('click', assignUserToTable);
    removeUserBtn.addEventListener('click', removeUserFromTable);
    deleteTableBtn.addEventListener('click', confirmDeleteTable);

    // Close modal buttons
    document.querySelectorAll('.close, .close-modal').forEach(button => {
        button.addEventListener('click', function() {
            addTableModal.style.display = 'none';
            tableDetailsModal.style.display = 'none';
            confirmationModal.style.display = 'none';
            successModal.style.display = 'none';
        });
    });

    // Confirm action button in confirmation modal
    document.getElementById('confirmActionBtn').addEventListener('click', function() {
        if (currentTableId) {
            deleteTable(currentTableId);
        }
    });

    // When user clicks outside modal, close it
    window.addEventListener('click', function(event) {
        if (event.target === addTableModal ||
            event.target === tableDetailsModal ||
            event.target === confirmationModal ||
            event.target === successModal) {
            event.target.style.display = 'none';
        }
    });

    // Load all tables from Firebase
    async function loadTables() {
        try {
            const tablesCollection = collection(db, 'tables');
            const tablesSnapshot = await getDocs(tablesCollection);

            tables = [];
            tablesSnapshot.forEach(doc => {
                tables.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            renderTables();
            updateCounters();
        } catch (error) {
            console.error('Error loading tables:', error);
            showSuccessModal('Error loading tables: ' + error.message);
        }
    }


    async function removeBookFromUser() {
        if (!currentTableId) {
            alert('Table ID missing');
            return;
        }

        try {
            // Find the table to get the assigned user
            const table = tables.find(t => t.id === currentTableId);
            if (!table || !table.assignedUser) {
                alert('No user is assigned to this table');
                return;
            }

            // Get user data
            const userData = await getUserByMembershipId(table.assignedUser);
            if (!userData) {
                alert('User data not found');
                return;
            }

            // Confirm before removing
            if (!confirm(`Are you sure you want to remove the current book from ${userData.fullName || userData.displayName}?`)) {
                return;
            }

            // Determine if currBook is in root or library object
            let updateObject = {};
            if (userData.hasOwnProperty('currBook')) {
                updateObject.currBook = null;
            } else if (userData.library?.hasOwnProperty('currBook')) {
                updateObject['library.currBook'] = null;
            } else {
                alert('No book found to remove');
                return;
            }

            // Update user document in Firebase
            const userRef = doc(db, 'users', userData.id);
            await updateDoc(userRef, updateObject);

            // Refresh the table details to reflect the change
            tableDetailsModal.style.display = 'none';
            showSuccessModal('Book removed from user successfully!');

            // Re-open table details after a short delay to refresh the display
            setTimeout(() => {
                openTableDetails(currentTableId);
            }, 500);
        } catch (error) {
            console.error('Error removing book from user:', error);
            alert('Error removing book from user: ' + error.message);
        }
    }

// // Make sure this event listener is initialized in your initTableManagement function
//     const removeBookBtn = document.getElementById('removeBookBtn');
//     if (removeBookBtn) {
//         removeBookBtn.addEventListener('click', removeBookFromUser);
//     }

    // Render tables to grid
    async function renderTables() {
        if (tables.length === 0) {
            tablesGrid.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">table_restaurant</span>
                    <p>No tables available</p>
                    <p>Click "Add New Table" to create your first table</p>
                </div>
            `;
            return;
        }

        tablesGrid.innerHTML = '';

        // Process all tables and fetch related data
        for (const table of tables) {
            const tableCard = document.createElement('div');
            tableCard.className = 'table-card';
            tableCard.setAttribute('data-table-id', table.id);

            const isOccupied = table.assignedUser != null;
            const statusClass = isOccupied ? 'status-occupied' : 'status-available';
            const statusText = isOccupied ? 'Occupied' : 'Available';

            // Base HTML structure
            let tableHTML = `
                <div class="table-icon">
                    <span class="material-symbols-outlined">table_restaurant</span>
                </div>
                <div class="table-content">
                    <h3>${table.tableId}</h3>
                    <p>${table.location}</p>
                    <p>Capacity: ${table.capacity}</p>
                    <p><span class="status-badge ${statusClass}">${statusText}</span></p>
            `;

            // If table is occupied, fetch and show user and book information
            if (isOccupied) {
                try {
                    // Get user data first
                    const userData = await getUserByMembershipId(table.assignedUser);

                    if (userData && userData.currBook) {
                        // If user has a current book, fetch book details
                        const bookData = await getBookByISBN(userData.currBook);

                        if (bookData) {
                            // Add book information to the table card
                            tableHTML += `
                                <div class="book-info">
                                    <div class="book-cover">
                                        <img src="${bookData.coverUrl || '/api/placeholder/60/90'}" alt="Book cover" width="60">
                                    </div>
                                    <div class="book-details">
                                        <p class="book-title">${bookData.title}</p>
                                        <p class="book-author">${Array.isArray(bookData.author) ? bookData.author[0] : bookData.author}</p>
                                    </div>
                                </div>
                            `;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching related data for table card:', error);
                }
            }

            // Close the table content div
            tableHTML += `</div>`;
            tableCard.innerHTML = tableHTML;

            tableCard.addEventListener('click', () => openTableDetails(table.id));
            tablesGrid.appendChild(tableCard);
        }
    }

    // Update counters in the header
    function updateCounters() {
        const totalTables = tables.length;
        const occupiedTables = tables.filter(table => table.assignedUser).length;
        const availableTables = totalTables - occupiedTables;

        totalTablesCounter.textContent = totalTables;
        occupiedTablesCounter.textContent = occupiedTables;
        availableTablesCounter.textContent = availableTables;
    }

    // Open add table modal
    function openAddTableModal() {
        // Clear form fields
        document.getElementById('tableId').value = '';
        document.getElementById('tableCapacity').value = '4';
        document.getElementById('tableLocation').value = '';
        document.getElementById('tableType').value = 'Study';

        // Show modal
        addTableModal.style.display = 'block';
    }

    // Save new table to Firebase
    async function saveNewTable() {
        const tableId = document.getElementById('tableId').value.trim();
        const capacity = parseInt(document.getElementById('tableCapacity').value);
        const location = document.getElementById('tableLocation').value.trim();
        const type = document.getElementById('tableType').value;

        // Validation
        if (!tableId) {
            alert('Please enter a table ID');
            return;
        }

        if (isNaN(capacity) || capacity <= 0) {
            alert('Please enter a valid capacity');
            return;
        }

        if (!location) {
            alert('Please enter a table location');
            return;
        }

        // Check if table ID already exists
        const existingTable = tables.find(table => table.tableId === tableId);
        if (existingTable) {
            alert('A table with this ID already exists');
            return;
        }

        try {
            const newTable = {
                tableId,
                capacity,
                location,
                type,
                createdAt: new Date().toISOString(),
                assignedUser: null
            };

            // Add to Firebase
            const docRef = await addDoc(collection(db, 'tables'), newTable);

            // Update local data
            newTable.id = docRef.id;
            tables.push(newTable);

            // Close modal and update UI
            addTableModal.style.display = 'none';
            renderTables();
            updateCounters();

            // Show success message
            showSuccessModal('Table added successfully!');
        } catch (error) {
            console.error('Error adding table:', error);
            alert('Error adding table: ' + error.message);
        }
    }

    // Open table details modal
    async function openTableDetails(tableId) {
        try {
            // Get table data
            const tableRef = doc(db, 'tables', tableId);
            const tableSnap = await getDoc(tableRef);

            if (!tableSnap.exists()) {
                alert('Table not found');
                return;
            }

            const tableData = {
                id: tableSnap.id,
                ...tableSnap.data()
            };

            currentTableId = tableId;

             // Safely set element content with null checks
            const safeSetText = (elementId, text) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = text;
                } else {
                    console.warn(`Element with ID "${elementId}" not found`);
                }
            };

            const safeSetHTML = (elementId, html) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.innerHTML = html;
                } else {
                    console.warn(`Element with ID "${elementId}" not found`);
                }
            };

            const safeSetSrc = (elementId, src) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.src = src;
                } else {
                    console.warn(`Element with ID "${elementId}" not found`);
                }
            };

            const safeToggleClass = (elementId, className, add) => {
                const element = document.getElementById(elementId);
                if (element) {
                    if (add) {
                        element.classList.add(className);
                    } else {
                        element.classList.remove(className);
                    }
                } else {
                    console.warn(`Element with ID "${elementId}" not found`);
                }
            };

            // Populate modal with table data
            safeSetText('modalTableId', tableData.tableId);
            safeSetText('modalTableCapacity', tableData.capacity);
            safeSetText('modalTableLocation', tableData.location);
            safeSetText('modalTableType', tableData.type);

            const statusBadge = tableData.assignedUser ?
                '<span class="status-badge status-occupied">Occupied</span>' :
                '<span class="status-badge status-available">Available</span>';
            safeSetHTML('modalTableStatus', statusBadge);

            // Reset user assignment sections
            const userMembershipIdInput = document.getElementById('userMembershipId');
            if (userMembershipIdInput) {
                userMembershipIdInput.value = '';
            }

            safeToggleClass('userAssignDetails', 'hidden', true);
            currentUserData = null;
            // Show/hide sections based on whether a user is assigned
           // Inside the openTableDetails function where it handles assigned users:
            if (tableData.assignedUser) {
                // User is assigned - show details and hide assign form
                safeToggleClass('assignUserSection', 'hidden', true);
                safeToggleClass('assignedUserSection', 'hidden', false);

                // Get user data
                const userData = await getUserByMembershipId(tableData.assignedUser);
                if (userData) {
                    safeSetText('assignedUserName', userData.fullName || userData.displayName);
                    safeSetText('assignedMembershipId', userData.membershipId || userData.library?.membershipId);
                    safeSetText('assignedUserEmail', userData.email);

                    safeToggleClass('removeBookBtn', 'hidden', true);

                    // Get current book - check both direct property and nested in library object
                    const currentBookISBN = userData.currBook || userData.library?.currBook;

                    // Check if user has a current book

                    const bookPreviewContainer = document.getElementById('bookPreviewContainer');
                    if (bookPreviewContainer) {
                        // Clear any previous content
                        bookPreviewContainer.innerHTML = '';
                    }
                    if (currentBookISBN) {
                        // Get book details
                        const bookData = await getBookByISBN(currentBookISBN);
                        if (bookData) {
                            // Book found - show book section and remove button
                            safeToggleClass('currentBookSection', 'hidden', false);
                            safeToggleClass('noBookSection', 'hidden', true);
                            safeToggleClass('removeBookBtn', 'hidden', false);

                            // Create book elements completely dynamically
                            if (bookPreviewContainer) {
                                // Create cover image element
                                const coverImg = document.createElement('img');
                                coverImg.alt = "Book cover";
                                coverImg.src = bookData.coverUrl || '/api/placeholder/80/120';

                                // Create info container
                                const infoDiv = document.createElement('div');
                                infoDiv.className = 'book-info-preview';

                                // Create and add title element
                                const titleElem = document.createElement('p');
                                titleElem.textContent = bookData.title;
                                titleElem.className = 'book-title';
                                infoDiv.appendChild(titleElem);

                                // Create and add author element
                                const authorElem = document.createElement('p');
                                authorElem.textContent = Array.isArray(bookData.author) ?
                                    bookData.author.join(', ') : bookData.author;
                                authorElem.className = 'book-author';
                                infoDiv.appendChild(authorElem);

                                // Create and add ISBN element
                                const isbnElem = document.createElement('p');
                                isbnElem.textContent = `ISBN: ${bookData.isbn}`;
                                isbnElem.className = 'book-isbn';
                                infoDiv.appendChild(isbnElem);

                                // Add elements to container
                                bookPreviewContainer.appendChild(coverImg);
                                bookPreviewContainer.appendChild(infoDiv);
                            }
                        } else {
                            // Book not found but ISBN exists - show "No Books Scanned Yet"
                            safeToggleClass('currentBookSection', 'hidden', true);
                            safeToggleClass('noBookSection', 'hidden', false);
                            safeToggleClass('removeBookBtn', 'hidden', true);
                            safeSetText('noBookMessage', 'No Books Scanned Yet');
                        }
                    } else {
                        // No book assigned - show "No Books Scanned Yet"
                        safeToggleClass('currentBookSection', 'hidden', true);
                        safeToggleClass('noBookSection', 'hidden', false);
                        safeToggleClass('removeBookBtn', 'hidden', true);
                        safeSetText('noBookMessage', 'No Books Scanned Yet');
                    }
                }
            } else {
                // No user assigned - hide relevant sections and buttons
                safeToggleClass('assignUserSection', 'hidden', false);
                safeToggleClass('assignedUserSection', 'hidden', true);
                safeToggleClass('currentBookSection', 'hidden', true);
                safeToggleClass('noBookSection', 'hidden', true);
                safeToggleClass('removeBookBtn', 'hidden', true);
            }

            // Show modal
            const modalElement = document.getElementById('tableDetailsModal');
            if (modalElement) {
                modalElement.style.display = 'block';
            } else {
                console.error('Table details modal element not found');
            }
        } catch (error) {
            console.error('Error opening table details:', error);
            alert('Error loading table details: ' + error.message);
        }
    }

    // Search for a user by membership ID
    async function searchUser() {
        const membershipId = document.getElementById('userMembershipId').value.trim();

        if (!membershipId) {
            alert('Please enter a membership ID');
            return;
        }

        try {
            const userData = await getUserByMembershipId(membershipId);

            if (!userData) {
                alert('User not found with this membership ID');
                document.getElementById('userAssignDetails').classList.add('hidden');
                currentUserData = null;
                return;
            }

            // Store user data for assignment
            currentUserData = userData;

            // Display user preview
            document.getElementById('previewUserName').textContent = userData.fullName || userData.displayName;
            document.getElementById('previewMembershipId').textContent = userData.membershipId;
            document.getElementById('userAssignDetails').classList.remove('hidden');
        } catch (error) {
            console.error('Error searching user:', error);
            alert('Error searching for user: ' + error.message);
        }
    }

    // Assign user to table
    async function assignUserToTable() {
        if (!currentTableId || !currentUserData) {
            alert('Missing table or user data');
            return;
        }

        // Extract membershipId from library object or fall back to direct property
        const membershipId = currentUserData.library?.membershipId || currentUserData.membershipId;

        if (!membershipId) {
            alert('Could not find a valid membership ID for this user');
            return;
        }

        try {
            // Check if user is already assigned to another table
            const existingTableWithUser = tables.find(table =>
                table.assignedUser === membershipId &&
                table.id !== currentTableId
            );

            if (existingTableWithUser) {
                alert(`This user is already assigned to table ${existingTableWithUser.tableId}`);
                return;
            }

            // Update table in Firebase
            const tableRef = doc(db, 'tables', currentTableId);
            await updateDoc(tableRef, {
                assignedUser: membershipId
            });

            // Update local data
            const tableIndex = tables.findIndex(table => table.id === currentTableId);
            if (tableIndex !== -1) {
                tables[tableIndex].assignedUser = membershipId;
            }

            // Close modal and refresh data
            tableDetailsModal.style.display = 'none';
            renderTables();
            updateCounters();

            // Show success message
            showSuccessModal('User assigned to table successfully!');
        } catch (error) {
            console.error('Error assigning user:', error);
            alert('Error assigning user to table: ' + error.message);
        }
    }

    // Remove user from table
    async function removeUserFromTable() {
        if (!currentTableId) {
            alert('Table ID missing');
            return;
        }

        try {
            // Update table in Firebase
            const tableRef = doc(db, 'tables', currentTableId);
            await updateDoc(tableRef, {
                assignedUser: null
            });

            // Update local data
            const tableIndex = tables.findIndex(table => table.id === currentTableId);
            if (tableIndex !== -1) {
                tables[tableIndex].assignedUser = null;
            }

            // Close modal and refresh data
            tableDetailsModal.style.display = 'none';
            renderTables();
            updateCounters();

            // Show success message
            showSuccessModal('User removed from table successfully!');
        } catch (error) {
            console.error('Error removing user:', error);
            alert('Error removing user from table: ' + error.message);
        }
    }

    // Show confirmation dialog for table deletion
    function confirmDeleteTable() {
        document.getElementById('confirmationMessage').textContent =
            'Are you sure you want to delete this table? This action cannot be undone.';
        confirmationModal.style.display = 'block';
    }

    // Delete table from Firebase
    async function deleteTable(tableId) {
        try {
            // Delete from Firebase
            await deleteDoc(doc(db, 'tables', tableId));

            // Update local data
            tables = tables.filter(table => table.id !== tableId);

            // Close modals
            confirmationModal.style.display = 'none';
            tableDetailsModal.style.display = 'none';

            // Refresh UI
            renderTables();
            updateCounters();

            // Show success message
            showSuccessModal('Table deleted successfully!');

            // Reset current table ID
            currentTableId = null;
        } catch (error) {
            console.error('Error deleting table:', error);
            alert('Error deleting table: ' + error.message);
        }
    }

    // Get user by membership ID
    async function getUserByMembershipId(membershipId) {
        try {
            console.log("Searching for user with membershipId:", membershipId);

            const usersCollection = collection(db, 'users');

            // First try searching in the nested library structure
            let q = query(usersCollection, where("library.membershipId", "==", membershipId));
            let querySnapshot = await getDocs(q);

            // If no results, try searching directly on the user object
            if (querySnapshot.empty) {
                q = query(usersCollection, where("membershipId", "==", membershipId));
                querySnapshot = await getDocs(q);
            }

            console.log("Results found:", querySnapshot.size);

            if (querySnapshot.empty) {
                return null;
            }

            // Return the first matching user
            const userData = querySnapshot.docs[0].data();
            return {
                id: querySnapshot.docs[0].id,
                ...userData
            };
        } catch (error) {
            console.error('Error getting user by membership ID:', error);
            throw error;
        }
    }

    // Get book details by ISBN
    // Get book details by ISBN
    async function getBookByISBN(isbn) {
        try {
            // Convert ISBN to number if it's a string
            const isbnValue = typeof isbn === 'string' ? Number(isbn) : isbn;

            console.log(`Searching for book with ISBN: ${isbn} (converted to ${isbnValue})`);

            const booksCollection = collection(db, 'books');
            const q = query(booksCollection, where("isbn", "==", isbnValue));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log(`No book found with ISBN: ${isbn} (converted to ${isbnValue})`);
                return null;
            }

            // Return the first matching book
            const bookData = querySnapshot.docs[0].data();
            console.log(`Found book with ISBN ${isbn}:`, bookData.title);
            return {
                id: querySnapshot.docs[0].id,
                ...bookData
            };
        } catch (error) {
            console.error('Error getting book by ISBN:', error);
            throw error;
        }
    }

    // Show success modal with message
    function showSuccessModal(message) {
        document.getElementById('successMessage').textContent = message;
        successModal.style.display = 'block';
    }
}