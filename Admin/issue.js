// Import Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, addDoc, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Set up logging function
function logMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]: `;

    switch(type.toLowerCase()) {
        case 'error':
            console.error(prefix + message);
            break;
        case 'warn':
            console.warn(prefix + message);
            break;
        case 'debug':
            console.debug(prefix + message);
            break;
        default:
            console.log(prefix + message);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    logMessage('DOM fully loaded and parsed');

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            mobileMenu.classList.toggle('active');
            logMessage('Mobile menu toggled');
        });
    } else {
        logMessage('Menu toggle element not found', 'warn');
    }

    // User dropdown toggle
    const userIcon = document.querySelector('.user-icon');
    const userDropdown = document.querySelector('.user-dropdown');

    if (userIcon) {
        userIcon.addEventListener('click', function(e) {
            e.preventDefault();
            userDropdown.classList.toggle('active');
            logMessage('User dropdown toggled');
        });
    } else {
        logMessage('User icon element not found', 'warn');
    }

    // Click outside to close dropdowns
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.menu-toggle-container') && !e.target.closest('.mobile-menu')) {
            if (mobileMenu) mobileMenu.classList.remove('active');
        }

        if (!e.target.closest('.user-icon') && !e.target.closest('.user-dropdown')) {
            if (userDropdown) userDropdown.classList.remove('active');
        }
    });

    // Set today's date as the issue date
    const issueDateInput = document.getElementById('issueDate');
    const returnDateInput = document.getElementById('returnDate');

    const today = new Date();
    const todayStr = formatDateForInput(today);

    // Set default dates
    if (issueDateInput) {
        issueDateInput.value = todayStr;
        logMessage('Issue date set to today: ' + todayStr);
    } else {
        logMessage('Issue date input not found', 'warn');
    }

    // Set return date to a week from today
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = formatDateForInput(nextWeek);

    if (returnDateInput) {
        returnDateInput.value = nextWeekStr;
        logMessage('Return date set to next week: ' + nextWeekStr);
    } else {
        logMessage('Return date input not found', 'warn');
    }

    // Search user by ID
    const searchUserBtn = document.getElementById('searchUser');
    if (searchUserBtn) {
        searchUserBtn.addEventListener('click', searchUser);
        logMessage('Search user button event listener added');
    } else {
        logMessage('Search user button not found', 'warn');
    }

    // Search book by ISBN
    const searchBookBtn = document.getElementById('searchBook');
    if (searchBookBtn) {
        searchBookBtn.addEventListener('click', searchBook);
        logMessage('Search book button event listener added');
    } else {
        logMessage('Search book button not found', 'warn');
    }

    // Issue book button
    const issueBookBtn = document.getElementById('issueBook');
    if (issueBookBtn) {
        issueBookBtn.addEventListener('click', issueBook);
        logMessage('Issue book button event listener added');
    } else {
        logMessage('Issue book button not found', 'warn');
    }

    // Reset form button
    const resetFormBtn = document.getElementById('resetForm');
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetForm);
        logMessage('Reset form button event listener added');
    } else {
        logMessage('Reset form button not found', 'warn');
    }

    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close, #modalOkButton, #modalCloseButton');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('successModal').style.display = 'none';
            document.getElementById('errorModal').style.display = 'none';
            logMessage('Modal closed');
        });
    });

    // Add keyboard event listeners for search fields
    const membershipIdInput = document.getElementById('membershipId');
    if (membershipIdInput) {
        membershipIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUser();
            }
        });
        logMessage('Membership ID keyboard event listener added');
    }

    const bookIsbnInput = document.getElementById('bookIsbn');
    if (bookIsbnInput) {
        bookIsbnInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBook();
            }
        });
        logMessage('Book ISBN keyboard event listener added');
    }

    // Set up date validation event listeners
    const issueDateChangeListener = document.getElementById('issueDate');
    const returnDateChangeListener = document.getElementById('returnDate');

    if (issueDateChangeListener && returnDateChangeListener) {
        issueDateChangeListener.addEventListener('change', validateDates);
        returnDateChangeListener.addEventListener('change', validateDates);
        logMessage('Date validation event listeners added');
    }

    // Load recent issues
    loadRecentIssues();
});

// Format date for input fields (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (Month Day, Year)
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Search user function - Fixed to properly query by membershipId field
// Search user function - Modified to query using nested library.membershipId field
async function searchUser() {
    const membershipId = document.getElementById('membershipId').value.trim();
    const userDetailsContainer = document.getElementById('userDetails');

    logMessage(`Searching for user with membershipId: ${membershipId}`);

    if (!membershipId) {
        showError('Please enter a membership ID');
        logMessage('Search aborted: No membership ID provided', 'warn');
        return;
    }

    try {
        // Query for users with matching library.membershipId field
        logMessage('Creating query for user lookup');
        const usersRef = collection(db, "users");

        // Log the query parameters
        logMessage(`Querying 'users' collection where library.membershipId == "${membershipId}"`);

        const q = query(usersRef, where("library.membershipId", "==", membershipId));
        logMessage('Executing user query...');
        const querySnapshot = await getDocs(q);

        logMessage(`Query returned ${querySnapshot.size} results`);

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            logMessage('User found: ' + JSON.stringify(userData));

            // Fill user details
            document.getElementById('userName').value = userData.personal?.fullName || userData.fullName || 'N/A';
            document.getElementById('userEmail').value = userData.personal?.email || userData.email || 'N/A';
            document.getElementById('membershipStatus').value = userData.library?.membershipType || 'N/A';

            // Format expiry date
            const expiryDate = userData.library?.membershipExpiry
                ? formatDateForDisplay(userData.library.membershipExpiry)
                : 'N/A';
            document.getElementById('expiryDate').value = expiryDate;

            // Show user details
            userDetailsContainer.classList.remove('hidden');
            logMessage('User details displayed successfully');
        } else {
            showError('User not found. Please check the ID and try again.');
            userDetailsContainer.classList.add('hidden');
            logMessage('No user found with the provided membershipId', 'warn');

            // Debug - List all users in the database
            logMessage('Listing all users in database for debugging:');
            const allUsersQuery = query(usersRef);
            const allUsers = await getDocs(allUsersQuery);

            if (!allUsers.empty) {
                allUsers.forEach((doc, index) => {
                    const user = doc.data();
                    logMessage(`User ${index + 1}: ID=${doc.id}, membershipId=${user.library?.membershipId || 'undefined'}, name=${user.personal?.fullName || user.fullName || 'N/A'}`);
                });
            } else {
                logMessage('No users found in database', 'warn');
            }
        }
    } catch (error) {
        console.error("Error searching for user:", error);
        showError('Error retrieving user details. Please try again.');
        logMessage(`Error searching for user: ${error.message}`, 'error');
    }
}

// Search book function with improved logging
async function searchBook() {
    const isbn = document.getElementById('bookIsbn').value.trim();
    const bookDetailsContainer = document.getElementById('bookDetails');

    logMessage(`Searching for book with ISBN: ${isbn}`);

    if (!isbn) {
        showError('Please enter a book ISBN');
        logMessage('Search aborted: No ISBN provided', 'warn');
        return;
    }

    try {
        // Query for the book with matching ISBN
        logMessage('Creating query for book lookup');
        const booksRef = collection(db, "books");

        // Log the query parameters
        logMessage(`Querying 'books' collection where isbn == "${isbn}"`);

        const q = query(booksRef, where("isbn", "==", isbn));
        logMessage('Executing book query...');
        const querySnapshot = await getDocs(q);

        logMessage(`Query returned ${querySnapshot.size} results`);

        if (!querySnapshot.empty) {
            const bookData = querySnapshot.docs[0].data();
            logMessage('Book found: ' + JSON.stringify(bookData));

            // Fill book details
            document.getElementById('bookTitle').value = bookData.title || 'N/A';
            document.getElementById('bookAuthor').value = bookData.author || 'N/A';
            document.getElementById('bookPublisher').value = bookData.publisher || 'N/A';

            // Set book cover image
            const bookCoverImg = document.getElementById('bookCover');
            if (bookCoverImg) {  // Check if element exists
                if (bookData.coverUrl) {
                    try {
                        logMessage(`Attempting to load cover image from: ${bookData.coverUrl}`);
                        // Try to get the cover image from Firebase Storage
                        const coverUrl = await getDownloadURL(ref(storage, bookData.coverUrl));
                        bookCoverImg.src = coverUrl;
                        logMessage('Cover image loaded successfully');
                    } catch (imgError) {
                        // Use placeholder if image can't be loaded
                        bookCoverImg.src = "/api/placeholder/120/180";
                        logMessage(`Failed to load cover image: ${imgError.message}`, 'warn');
                    }
                } else {
                    bookCoverImg.src = "/api/placeholder/120/180";
                    logMessage('No cover URL provided, using placeholder', 'info');
                }
            }

            // Show book details
            bookDetailsContainer.classList.remove('hidden');
            logMessage('Book details displayed successfully');
        } else {
            showError('Book not found. Please check the ISBN and try again.');
            bookDetailsContainer.classList.add('hidden');
            logMessage('No book found with the provided ISBN', 'warn');
        }
    } catch (error) {
        console.error("Error searching for book:", error);
        showError('Error retrieving book details. Please try again.');
        logMessage(`Error searching for book: ${error.message}`, 'error');
    }
}

// Check if book is already issued and not returned
async function checkBookAvailability(isbn) {
    logMessage(`Checking availability for book with ISBN: ${isbn}`);

    try {
        const issuesRef = collection(db, "bookIssues");
        const q = query(
            issuesRef,
            where("bookIsbn", "==", isbn),
            where("status", "==", "issued")
        );

        logMessage('Executing book availability query...');
        const querySnapshot = await getDocs(q);
        const isAvailable = querySnapshot.empty;

        logMessage(`Book availability check result: ${isAvailable ? 'Available' : 'Not available'}`);
        return isAvailable; // Book is available if no active issues found
    } catch (error) {
        logMessage(`Error checking book availability: ${error.message}`, 'error');
        return false; // Assume unavailable if error occurs
    }
}

// Check user borrowing limit
// Check user borrowing limit
async function checkUserBorrowingLimit(membershipId) {
    logMessage(`Checking borrowing limit for user: ${membershipId}`);

    try {
        const issuesRef = collection(db, "bookIssues");
        const q = query(
            issuesRef,
            where("membershipId", "==", membershipId),
            where("status", "==", "issued")
        );

        logMessage('Executing borrowing limit query...');
        const querySnapshot = await getDocs(q);
        const currentBorrowed = querySnapshot.size;
        const canBorrow = currentBorrowed < 3;

        logMessage(`User has ${currentBorrowed}/3 books currently borrowed`);
        logMessage(`User can borrow more books: ${canBorrow}`);

        return canBorrow;
    } catch (error) {
        logMessage(`Error checking user borrowing limit: ${error.message}`, 'error');
        return false; // Assume limit reached if error occurs
    }
}

// Issue book function with improved logging and validation
async function issueBook() {
    logMessage('Starting book issue process');

    const membershipId = document.getElementById('membershipId').value.trim();
    const bookIsbn = document.getElementById('bookIsbn').value.trim();
    const issueDate = document.getElementById('issueDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const notes = document.getElementById('notes').value.trim();

    logMessage(`Issue request details: 
    - Membership ID: ${membershipId}
    - Book ISBN: ${bookIsbn}
    - Issue Date: ${issueDate}
    - Return Date: ${returnDate}
    - Notes length: ${notes.length} characters`);

    // Form validation
    if (!membershipId || !bookIsbn || !issueDate || !returnDate) {
        showError('Please fill in all required fields');
        logMessage('Issue aborted: Missing required fields', 'warn');
        return;
    }

    try {
        // Check if user exists - Updated to query by membershipId field
        // Check if user exists - Updated to query by the nested library.membershipId field
        logMessage('Verifying user exists');
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("library.membershipId", "==", membershipId));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            showError('User not found. Please check the ID and try again.');
            logMessage('Issue aborted: User not found', 'warn');
            return;
        }
        logMessage('User verified successfully');

        // Check if book exists
        logMessage('Verifying book exists');
        const booksRef = collection(db, "books");
        const bookQuery = query(booksRef, where("isbn", "==", bookIsbn));
        const bookSnapshot = await getDocs(bookQuery);

        if (bookSnapshot.empty) {
            showError('Book not found. Please check the ISBN and try again.');
            logMessage('Issue aborted: Book not found', 'warn');
            return;
        }
        logMessage('Book verified successfully');

        // Check if book is available
        logMessage('Checking book availability');
        const isBookAvailable = await checkBookAvailability(bookIsbn);
        if (!isBookAvailable) {
            showError('This book is currently issued to another user.');
            logMessage('Issue aborted: Book is already issued', 'warn');
            return;
        }
        logMessage('Book is available for issue');

        // Check if user has reached borrowing limit
        logMessage('Checking user borrowing limit');
        const canBorrow = await checkUserBorrowingLimit(membershipId);
        if (!canBorrow) {
            showError('User has reached the maximum borrowing limit (3 books).');
            logMessage('Issue aborted: User has reached borrowing limit', 'warn');
            return;
        }
        logMessage('User has not reached borrowing limit');

        const bookData = bookSnapshot.docs[0].data();
        const userData = userSnapshot.docs[0].data();

        // Create a new issue record
        logMessage('Creating issue record');
        const issueData = {
            membershipId: membershipId,
            userFullName: userData.fullName || 'N/A',
            userEmail: userData.email || 'N/A',
            bookIsbn: bookIsbn,
            bookTitle: bookData.title || 'N/A',
            bookAuthor: bookData.author || 'N/A',
            issueDate: issueDate,
            returnDate: returnDate,
            notes: notes,
            status: 'issued',
            issuedBy: 'admin', // The current admin user
            issueTimestamp: new Date()
        };

        logMessage('Issue data prepared: ' + JSON.stringify(issueData));

        // Add to Firestore
        logMessage('Adding issue record to Firestore');
        const docRef = await addDoc(collection(db, "bookIssues"), issueData);
        logMessage(`Issue record created with ID: ${docRef.id}`);

        // Show success message
        document.getElementById('successModal').style.display = 'block';
        logMessage('Success modal displayed');

        // Reset form and reload recent issues
        resetForm();
        logMessage('Form reset');

        loadRecentIssues();
        logMessage('Recent issues reloaded');

    } catch (error) {
        console.error("Error issuing book:", error);
        showError('Error issuing book. Please try again.');
        logMessage(`Error issuing book: ${error.message}`, 'error');
    }
}

// Reset form function
function resetForm() {
    logMessage('Resetting form');

    document.getElementById('membershipId').value = '';
    document.getElementById('bookIsbn').value = '';
    document.getElementById('notes').value = '';

    // Reset dates
    const today = new Date();
    const todayStr = formatDateForInput(today);
    document.getElementById('issueDate').value = todayStr;

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = formatDateForInput(nextWeek);
    document.getElementById('returnDate').value = nextWeekStr;

    // Hide details sections
    document.getElementById('userDetails').classList.add('hidden');
    document.getElementById('bookDetails').classList.add('hidden');

    logMessage('Form reset complete');
}

// Show error message
function showError(message) {
    logMessage(`Error: ${message}`, 'error');
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'block';
}

// Load recent issues
async function loadRecentIssues() {
    logMessage('Loading recent issues');

    try {
        const issuesRef = collection(db, "bookIssues");
        const q = query(issuesRef, orderBy("issueTimestamp", "desc"), limit(5));

        logMessage('Executing recent issues query');
        const querySnapshot = await getDocs(q);
        logMessage(`Found ${querySnapshot.size} recent issues`);

        if (!querySnapshot.empty) {
            const tableBody = document.getElementById('issueHistoryBody');
            tableBody.innerHTML = '';
            const issueHistoryContainer = document.getElementById('issueHistoryContainer');

            // Show the recent issues container
            issueHistoryContainer.classList.remove('hidden');
            logMessage('Issue history container displayed');

            let index = 0;
            querySnapshot.forEach((doc) => {
                const issueData = doc.data();
                const row = document.createElement('tr');
                index++;

                logMessage(`Processing issue ${index}: ${issueData.bookTitle} for ${issueData.membershipId}`);

                // Determine status class
                let statusClass = 'status-issued';
                let statusText = 'Issued';

                if (issueData.status === 'returned') {
                    statusClass = 'status-returned';
                    statusText = 'Returned';
                } else if (new Date(issueData.returnDate) < new Date()) {
                    statusClass = 'status-overdue';
                    statusText = 'Overdue';
                }

                row.innerHTML = `
                    <td>${issueData.membershipId}</td>
                    <td>${issueData.bookTitle}</td>
                    <td>${formatDateForDisplay(issueData.issueDate)}</td>
                    <td>${formatDateForDisplay(issueData.returnDate)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                `;

                tableBody.appendChild(row);
                logMessage(`Issue ${index} added to table`);
            });
        } else {
            // Hide the recent issues container if no issues found
            document.getElementById('issueHistoryContainer').classList.add('hidden');
            logMessage('No recent issues found, hiding container');
        }
    } catch (error) {
        console.error("Error loading recent issues:", error);
        logMessage(`Error loading recent issues: ${error.message}`, 'error');
        // Hide the container on error
        document.getElementById('issueHistoryContainer').classList.add('hidden');
    }
}

// Validate dates function
function validateDates() {
    logMessage('Validating dates');

    const issueDate = new Date(document.getElementById('issueDate').value);
    const returnDate = new Date(document.getElementById('returnDate').value);

    logMessage(`Issue date: ${issueDate.toISOString()}, Return date: ${returnDate.toISOString()}`);

    if (returnDate <= issueDate) {
        showError('Return date must be after issue date');
        logMessage('Invalid dates: Return date is not after issue date', 'warn');

        // Reset return date to one week after issue date
        const newReturnDate = new Date(issueDate);
        newReturnDate.setDate(issueDate.getDate() + 7);
        document.getElementById('returnDate').value = formatDateForInput(newReturnDate);
        logMessage(`Return date reset to: ${formatDateForInput(newReturnDate)}`);
    } else {
        logMessage('Dates are valid');
    }
}