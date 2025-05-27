// books-database.js
import {
    db,
    getBooks,
    getBookById,
    getAllGenres,
    getBooksByGenre,
    searchBooks,
    getCurrentUser,
    protectRoute,
    checkAdminAccess,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    collection
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Check if user is authenticated and has admin access
    const currentUser = getCurrentUser();
    // if (!protectRoute()) return;
    // if (!(await checkAdminAccess(currentUser.uid))) return;

    // Initialize variables
    let allBooks = [];
    let currentPage = 1;
    let booksPerPage = 10;
    let filteredBooks = [];
    let currentSortField = 'title';
    let currentSortDirection = 'asc';

    // DOM Elements
    const booksTableBody = document.getElementById('booksTableBody');
    const searchInput = document.getElementById('searchInput');
    const searchField = document.getElementById('searchField');
    const searchButton = document.getElementById('searchButton');
    const genreFilter = document.getElementById('genreFilter');
    const refreshTable = document.getElementById('refreshTable');
    const addNewBook = document.getElementById('addNewBook');
    const pageInfo = document.getElementById('pageInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    // Modal Elements
    const bookModal = document.getElementById('bookModal');
    const modalTitle = document.getElementById('modalTitle');
    const bookForm = document.getElementById('bookForm');
    const bookId = document.getElementById('bookId');
    const coverPreview = document.getElementById('coverPreview');
    const coverUrl = document.getElementById('coverUrl');
    const changeCover = document.getElementById('changeCover');
    const saveBook = document.getElementById('saveBook');
    const cancelEdit = document.getElementById('cancelEdit');
    const deleteBook = document.getElementById('deleteBook');

    const rfidModal = document.getElementById('rfidModal');
    const rfidBookId = document.getElementById('rfidBookId');
    const rfidBookIsbn = document.getElementById('rfidBookIsbn');
    const rfidTag = document.getElementById('rfidTag');
    const saveRfidBtn = document.getElementById('saveRfid');
    const cancelRfidBtn = document.getElementById('cancelRfid');
    const rfidModalCloseBtn = rfidModal.querySelector('.close');


    // Delete Confirmation Modal
    const deleteModal = document.getElementById('deleteModal');
    const deleteBookTitle = document.getElementById('deleteBookTitle');
    const confirmDelete = document.getElementById('confirmDelete');
    const cancelDelete = document.getElementById('cancelDelete');

    // Toast Notification
    const toastNotification = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');

    // Initialize the books table
    await initializeTable();

    // Load all genres for the filter dropdown
    await loadGenres();

    // Event Listeners
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    genreFilter.addEventListener('change', handleGenreFilter);
    refreshTable.addEventListener('click', resetAndRefreshTable);
    addNewBook.addEventListener('click', function () {
        window.location.href = 'add-books.html';
    });

    // Modal event listeners
    saveBook.addEventListener('click', saveBookData);
    cancelEdit.addEventListener('click', closeBookModal);
    deleteBook.addEventListener('click', showDeleteConfirmation);

    // Delete confirmation modal
    confirmDelete.addEventListener('click', handleDeleteBook);
    cancelDelete.addEventListener('click', closeDeleteModal);

    // Close modals when clicking on the X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function () {
            bookModal.style.display = 'none';
            deleteModal.style.display = 'none';
        });
    });

    // Cover image preview functionality
    coverUrl.addEventListener('input', function () {
        coverPreview.src = this.value || "/api/placeholder/200/300";
    });

    changeCover.addEventListener('click', function () {
        coverUrl.focus();
    });

    // Pagination controls
    prevPage.addEventListener('click', goToPreviousPage);
    nextPage.addEventListener('click', goToNextPage);

    // Table sorting
    document.querySelectorAll('th i.fa-sort').forEach(sortIcon => {
        sortIcon.parentElement.addEventListener('click', function () {
            const field = this.textContent.trim().toLowerCase();
            handleSort(field);
        });
    });

    // Initialize the books table
    async function initializeTable() {
        try {
            allBooks = await getBooks(100); // Get up to 100 books
            filteredBooks = [...allBooks];
            renderBooks();
        } catch (error) {
            console.error("Error initializing table:", error);
            showToast("Error loading books. Please try again.", "error");
        }
    }

    // Function to open RFID modal when scan icon is clicked
    function openRfidModal(bookId, isbn) {
        rfidBookId.value = bookId;
        rfidBookIsbn.value = isbn;
        rfidTag.value = '';
        rfidModal.style.display = 'block';
        rfidTag.focus();
    }

    // Close RFID modal
    function closeRfidModal() {
        rfidModal.style.display = 'none';
    }

    // Event listeners for RFID modal
    rfidModalCloseBtn.addEventListener('click', closeRfidModal);
    cancelRfidBtn.addEventListener('click', closeRfidModal);

    // Save RFID tag to database
    saveRfidBtn.addEventListener('click', async function () {
        if (!rfidTag.value.trim()) {
            showToast('Please enter an RFID tag', 'error');
            return;
        }

        try {
            const bookId = rfidBookId.value;
            const rfidValue = rfidTag.value.trim();

            // Update the book document in Firebase with the RFID tag
            await updateDoc(doc(db, 'books', bookId), {
                rfid: rfidValue
            });

            showToast('RFID tag saved successfully');
            closeRfidModal();

            // Refresh the table to show updated data
            resetAndRefreshTable();
        } catch (error) {
            console.error('Error saving RFID tag:', error);
            showToast('Error saving RFID tag: ' + error.message, 'error');
        }
    });

    // Function to create action buttons for each book row
    function createActionButtons(book) {
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';

        // View button
        const viewBtn = document.createElement('button');
        viewBtn.className = 'book-action view-action';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        viewBtn.title = 'View Details';
        viewBtn.setAttribute('data-id', book.id); // Add data-id attribute
        viewBtn.addEventListener('click', function() {
            openBookDetails(book.id, false);
        });

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'book-action edit-action';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit Book';
        editBtn.setAttribute('data-id', book.id); // Add data-id attribute
        editBtn.addEventListener('click', function() {
            openBookDetails(book.id, true);
        });

        // RFID Scan button
        const scanBtn = document.createElement('button');
        scanBtn.className = 'book-action scan-action';
        scanBtn.innerHTML = '<i class="fas fa-qrcode"></i>';
        scanBtn.title = 'Scan RFID Tag';
        scanBtn.addEventListener('click', () => openRfidModal(book.id, book.isbn));

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'book-action delete-action';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Delete Book';
        deleteBtn.setAttribute('data-id', book.id); // Add data-id attribute
        deleteBtn.addEventListener('click', function() {
            openDeleteModal(book.id, book.title);
        });

        actionsCell.appendChild(viewBtn);
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(scanBtn);
        actionsCell.appendChild(deleteBtn);

        return actionsCell;
    }

    // Function to open delete modal
    function openDeleteModal(bookId, bookTitle) {
        document.getElementById('bookId').value = bookId;
        deleteBookTitle.textContent = bookTitle || 'this book';
        deleteModal.style.display = 'block';
    }

    // Toast notification function
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toastNotification');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = toast.querySelector('.toast-icon i');

        toastMessage.textContent = message;

        // Set appropriate styles based on type
        if (type === 'error') {
            toast.style.background = 'rgba(220, 53, 69, 0.2)';
            toast.style.borderColor = 'rgba(220, 53, 69, 0.3)';
            toastIcon.className = 'fas fa-exclamation-circle';
            toastIcon.style.color = '#ff6b6b';
        } else {
            toast.style.background = 'rgba(0, 255, 100, 0.2)';
            toast.style.borderColor = 'rgba(0, 255, 100, 0.3)';
            toastIcon.className = 'fas fa-check-circle';
            toastIcon.style.color = '#0f0';
        }

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Load all genres for the filter dropdown
    async function loadGenres() {
        try {
            const genres = await getAllGenres();
            genreFilter.innerHTML = '<option value="">All Genres</option>';

            genres.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre;
                option.textContent = genre;
                genreFilter.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading genres:", error);
        }
    }

    // Render books table
    function renderBooks() {
        const startIndex = (currentPage - 1) * booksPerPage;
        const endIndex = startIndex + booksPerPage;
        const booksToDisplay = filteredBooks.slice(startIndex, endIndex);

        booksTableBody.innerHTML = '';

        if (booksToDisplay.length === 0) {
            booksTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-results">
                        <i class="fas fa-search"></i>
                        No books found. Try a different search or filter.
                    </td>
                </tr>
            `;
        } else {
            booksToDisplay.forEach(book => {
                const row = document.createElement('tr');

                // Cover column
                const coverCell = document.createElement('td');
                coverCell.className = 'book-cover-cell';
                if (book.coverUrl) {
                    coverCell.innerHTML = `<img src="${book.coverUrl}" alt="${book.title}" class="book-cover-thumbnail">`;
                } else {
                    coverCell.innerHTML = `<div class="no-cover-placeholder"><i class="fas fa-book"></i></div>`;
                }

                // Title column
                const titleCell = document.createElement('td');
                titleCell.className = 'book-title-cell';
                titleCell.innerHTML = `<div class="book-title" title="${book.title}">${book.title}</div>`;

                // ISBN column
                const isbnCell = document.createElement('td');
                isbnCell.className = 'book-isbn-cell';
                isbnCell.textContent = book.isbn || '-';

                // Author column
                const authorCell = document.createElement('td');
                authorCell.className = 'book-author-cell';
                const authors = Array.isArray(book.author) ? book.author.join(', ') : book.author || '-';
                authorCell.innerHTML = `<div class="book-author" title="${authors}">${authors}</div>`;

                // Publisher column
                const publisherCell = document.createElement('td');
                publisherCell.textContent = book.publisher || '-';

                // Genre column
                const genreCell = document.createElement('td');
                if (book.genres && book.genres.length > 0) {
                    const genreTags = book.genres.map(genre =>
                        `<span class="genre-tag">${genre}</span>`
                    ).join('');
                    genreCell.innerHTML = `<div class="genre-tags">${genreTags}</div>`;
                } else {
                    genreCell.textContent = '-';
                }

                // Actions column
                const actionsCell = createActionButtons({
                    id: book.id,
                    title: book.title,
                    isbn: book.isbn
                });

                // Add all cells to the row
                row.appendChild(coverCell);
                row.appendChild(titleCell);
                row.appendChild(isbnCell);
                row.appendChild(authorCell);
                row.appendChild(publisherCell);
                row.appendChild(genreCell);
                row.appendChild(actionsCell);

                booksTableBody.appendChild(row);
            });
        }

        // Update pagination info
        updatePagination();
    }

    // Update pagination
    function updatePagination() {
        const totalBooks = filteredBooks.length;
        const totalPages = Math.ceil(totalBooks / booksPerPage);

        pageInfo.textContent = `Showing ${(currentPage - 1) * booksPerPage + 1} to ${Math.min(currentPage * booksPerPage, totalBooks)} of ${totalBooks} entries`;

        // Update page numbers
        pageNumbers.innerHTML = '';

        const maxPages = 5; // Maximum number of page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(totalPages, startPage + maxPages - 1);

        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageNumberBtn = document.createElement('button');
            pageNumberBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
            pageNumberBtn.textContent = i;
            pageNumberBtn.addEventListener('click', function () {
                currentPage = i;
                renderBooks();
            });
            pageNumbers.appendChild(pageNumberBtn);
        }

        // Update previous/next buttons
        prevPage.disabled = currentPage <= 1;
        nextPage.disabled = currentPage >= totalPages;
    }

    // Handle search
    async function handleSearch() {
        const searchTerm = searchInput.value.trim();
        const field = searchField.value;

        if (searchTerm === '') {
            filteredBooks = [...allBooks];
        } else {
            try {
                if (field === 'title' || field === 'author' || field === 'isbn' || field === 'publisher') {
                    // Filter locally for these common fields
                    filteredBooks = allBooks.filter(book => {
                        if (field === 'author' && Array.isArray(book.author)) {
                            return book.author.some(author =>
                                author.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                        } else if (field === 'genres' && Array.isArray(book.genres)) {
                            return book.genres.some(genre =>
                                genre.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                        } else {
                            const value = book[field];
                            return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
                        }
                    });
                } else {
                    // For more complex searches, use the Firebase search function
                    filteredBooks = await searchBooks(searchTerm, field);
                }
            } catch (error) {
                console.error("Error searching books:", error);
                showToast("Error searching books. Please try again.", "error");
                filteredBooks = [];
            }
        }

        currentPage = 1; // Reset to first page
        renderBooks();
    }

    // Handle genre filter
    async function handleGenreFilter() {
        const selectedGenre = genreFilter.value;

        if (selectedGenre === '') {
            filteredBooks = [...allBooks];
        } else {
            try {
                filteredBooks = await getBooksByGenre(selectedGenre);
            } catch (error) {
                console.error("Error filtering by genre:", error);
                showToast("Error applying genre filter. Please try again.", "error");
                filteredBooks = [];
            }
        }

        currentPage = 1; // Reset to first page
        renderBooks();
    }

    // Handle sort
    function handleSort(field) {
        // Toggle sort direction if clicking the same field again
        if (currentSortField === field) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = field;
            currentSortDirection = 'asc';
        }

        // Sort the filtered books
        filteredBooks.sort((a, b) => {
            let valueA, valueB;

            if (field === 'author') {
                valueA = Array.isArray(a.author) ? a.author.join(', ') : a.author || '';
                valueB = Array.isArray(b.author) ? b.author.join(', ') : b.author || '';
            } else {
                valueA = a[field] || '';
                valueB = b[field] || '';
            }

            // Convert to string and lowercase for comparison
            valueA = valueA.toString().toLowerCase();
            valueB = valueB.toString().toLowerCase();

            if (currentSortDirection === 'asc') {
                return valueA.localeCompare(valueB);
            } else {
                return valueB.localeCompare(valueA);
            }
        });

        renderBooks();

        // Update sort icons (optional visual feedback)
        document.querySelectorAll('th i.fa-sort').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        const columnHeader = document.querySelector(`th:contains("${field[0].toUpperCase() + field.slice(1)}")`);
        if (columnHeader) {
            const icon = columnHeader.querySelector('i');
            if (icon) {
                icon.className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
        }
    }

    // Reset and refresh table
    async function resetAndRefreshTable() {
        searchInput.value = '';
        genreFilter.value = '';
        currentPage = 1;
        currentSortField = 'title';
        currentSortDirection = 'asc';

        try {
            allBooks = await getBooks(100);
            filteredBooks = [...allBooks];
            renderBooks();
            showToast("Table refreshed successfully");
        } catch (error) {
            console.error("Error refreshing table:", error);
            showToast("Error refreshing table. Please try again.", "error");
        }
    }

    // Open book details/edit modal
    async function openBookDetails(bookId, isEditable = false) {
        try {
            if (!bookId) {
                showToast("Invalid book ID", "error");
                return;
            }

            modalTitle.innerHTML = isEditable ?
                '<i class="fas fa-edit"></i> Edit Book' :
                '<i class="fas fa-book"></i> Book Details';

            const book = await getBookById(bookId);

            if (!book) {
                showToast("Book not found", "error");
                return;
            }

            // Fill in form fields
            document.getElementById('bookId').value = book.id;
            document.getElementById('title').value = book.title || '';
            document.getElementById('isbn').value = book.isbn || '';
            document.getElementById('author').value = Array.isArray(book.author) ? book.author.join(', ') : book.author || '';
            document.getElementById('publisher').value = book.publisher || '';
            document.getElementById('publicationYear').value = book.publicationYear || '';
            document.getElementById('genres').value = Array.isArray(book.genres) ? book.genres.join(', ') : book.genres || '';
            document.getElementById('pageCount').value = book.pageCount || '';
            document.getElementById('language').value = book.language || '';
            document.getElementById('description').value = book.description || '';
            document.getElementById('coverUrl').value = book.coverUrl || '';

            // Set cover image
            coverPreview.src = book.coverUrl || "/api/placeholder/200/300";

            // Added info
            document.getElementById('addedBy').textContent = book.addedBy || '-';
            document.getElementById('addedDate').textContent = book.addedDate ? new Date(book.addedDate).toLocaleString() : '-';

            // Set form to read-only if not editable
            const formElements = bookForm.elements;
            for (let i = 0; i < formElements.length; i++) {
                formElements[i].disabled = !isEditable;
            }

            // Show/hide buttons based on mode
            saveBook.style.display = isEditable ? 'flex' : 'none';
            deleteBook.style.display = isEditable ? 'flex' : 'none';

            // Show modal
            bookModal.style.display = 'block';
        } catch (error) {
            console.error("Error opening book details:", error);
            showToast("Error loading book details. Please try again.", "error");
        }
    }

    // Show add book modal
    function showAddBookModal() {
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> Add New Book';

        // Clear form fields
        bookForm.reset();
        document.getElementById('bookId').value = '';
        coverPreview.src = "/api/placeholder/200/300";

        // Added info
        document.getElementById('addedBy').textContent = getCurrentUser().email || getCurrentUser().displayName || getCurrentUser().uid;
        document.getElementById('addedDate').textContent = new Date().toLocaleString();

        // Enable form
        const formElements = bookForm.elements;
        for (let i = 0; i < formElements.length; i++) {
            formElements[i].disabled = false;
        }

        // Show buttons
        saveBook.style.display = 'flex';
        deleteBook.style.display = 'none'; // Hide delete button for new books

        // Show modal
        bookModal.style.display = 'block';
    }

    // Save book data
    async function saveBookData() {
        try {
            // Validate required fields
            const title = document.getElementById('title').value.trim();
            const isbn = document.getElementById('isbn').value.trim();
            const author = document.getElementById('author').value.trim();

            if (!title || !isbn || !author) {
                showToast("Please fill in all required fields", "error");
                return;
            }

            // Prepare book data
            const bookData = {
                title,
                isbn,
                author: author.split(',').map(a => a.trim()),
                publisher: document.getElementById('publisher').value.trim(),
                publicationYear: document.getElementById('publicationYear').value.trim(),
                genres: document.getElementById('genres').value.trim() ?
                    document.getElementById('genres').value.split(',').map(g => g.trim()) : [],
                pageCount: parseInt(document.getElementById('pageCount').value) || 0,
                language: document.getElementById('language').value.trim(),
                description: document.getElementById('description').value.trim(),
                coverUrl: document.getElementById('coverUrl').value.trim()
            };

            const bookIdValue = document.getElementById('bookId').value;

            if (bookIdValue) {
                // Update existing book
                await updateDoc(doc(db, 'books', bookIdValue), bookData);
                showToast("Book updated successfully");
            } else {
                // Add new book
                bookData.addedBy = getCurrentUser().email || getCurrentUser().displayName || getCurrentUser().uid;
                bookData.addedDate = new Date().toISOString();

                await addDoc(collection(db, 'books'), bookData);
                showToast("Book added successfully");
            }

            // Close modal and refresh table
            closeBookModal();
            await resetAndRefreshTable();
        } catch (error) {
            console.error("Error saving book:", error);
            showToast("Error saving book. Please try again.", "error");
        }
    }

    // Handle delete book
    async function handleDeleteBook() {
        try {
            const bookIdValue = document.getElementById('bookId').value;
            if (!bookIdValue) {
                showToast("Book ID not found", "error");
                return;
            }

            await deleteDoc(doc(db, 'books', bookIdValue));

            closeDeleteModal();
            closeBookModal();
            showToast("Book deleted successfully");
            await resetAndRefreshTable();
        } catch (error) {
            console.error("Error deleting book:", error);
            showToast("Error deleting book. Please try again.", "error");
        }
    }

    // Show delete confirmation for the current book
    function showDeleteConfirmation() {
        const bookIdValue = document.getElementById('bookId').value;
        const bookTitle = document.getElementById('title').value;
        openDeleteModal(bookIdValue, bookTitle);
    }

    // Close book modal
    function closeBookModal() {
        bookModal.style.display = 'none';
    }

    // Close delete modal
    function closeDeleteModal() {
        deleteModal.style.display = 'none';
    }

    // Go to previous page
    function goToPreviousPage() {
        if (currentPage > 1) {
            currentPage--;
            renderBooks();
        }
    }

    // Go to next page
    function goToNextPage() {
        const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderBooks();
        }
    }

    // Helper function to find element containing text
    // Used for sorting columns by header text
    if (!Element.prototype.matches) {
        Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
    }

    if (!Element.prototype.closest) {
        Element.prototype.closest = function (s) {
            var el = this;
            do {
                if (el.matches(s)) return el;
                el = el.parentElement || el.parentNode;
            } while (el !== null && el.nodeType === 1);
            return null;
        };
    }

    // Safer approach without using jQuery
    function getElementByText(selector, text) {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].textContent.trim().toLowerCase() === text.toLowerCase()) {
                return elements[i];
            }
        }
        return null;
    }
});