// Import Firebase functions and configuration
import {
  protectRoute,
  auth,
  db,
  getCurrentUser,
  isAuthenticated
} from './firebase-config-admin.js';

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

// Import the collection initialization function
import { initializeFirestoreCollections } from './firebase-collection-setup.js';

// DOM Elements
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize collections first to ensure they exist
  try {
    await initializeFirestoreCollections();
    console.log("Collections initialized, proceeding with app initialization");
  } catch (error) {
    console.error("Error initializing collections:", error);
    showStatus("Database initialization failed. Check console for details.", "error");
  }

  // Check if user is authenticated
  if (!protectRoute()) {
    return;
  }

  // Navigation elements
  const menuToggle = document.querySelector('.menu-toggle-container');
  const mobileMenu = document.querySelector('.mobile-menu');
  const userIcon = document.querySelector('.user-icon');
  const userDropdown = document.querySelector('.user-dropdown');

  // Tab elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // File upload elements
  const fileUploadArea = document.querySelector('.file-upload-area');
  const fileUploadInput = document.getElementById('fileUpload');
  const downloadTemplate = document.getElementById('downloadTemplate');
  const previewContainer = document.querySelector('.preview-container');
  const previewTable = document.getElementById('previewTable');
  const previewCount = document.getElementById('previewCount');
  const totalCount = document.getElementById('totalCount');
  const cancelUpload = document.getElementById('cancelUpload');
  const uploadToDatabase = document.getElementById('uploadToDatabase');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressStatus = document.getElementById('progressStatus');
  const fetchCoverStatus = document.getElementById('fetchCoverStatus');

  // Manual add elements
  const addBookForm = document.getElementById('addBookForm');
  const fetchBookInfo = document.getElementById('fetchBookInfo');
  const fetchCover = document.getElementById('fetchCover');
  const coverPreview = document.getElementById('coverPreview');
  const statusMessage = document.getElementById('statusMessage');

  // Navigation events
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      mobileMenu.classList.toggle('active');
      userDropdown.classList.remove('active');
    });
  }

  if (userIcon) {
    userIcon.addEventListener('click', (e) => {
      e.preventDefault();
      userDropdown.classList.toggle('active');
      mobileMenu.classList.remove('active');
    });
  }

  // Close dropdowns when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-toggle-container') && !e.target.closest('.mobile-menu')) {
      mobileMenu.classList.remove('active');
    }
    if (!e.target.closest('.user-icon') && !e.target.closest('.user-dropdown')) {
      userDropdown.classList.remove('active');
    }
  });

  // Tab functionality
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding pane
      button.classList.add('active');
      const tabId = button.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // File Upload Functionality
  // Drag and drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileUploadArea.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    fileUploadArea.classList.add('highlight');
  }

  function unhighlight() {
    fileUploadArea.classList.remove('highlight');
  }

  fileUploadArea.addEventListener('drop', handleDrop, false);
  fileUploadArea.addEventListener('click', () => {
    fileUploadInput.click();
  });

  fileUploadInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  }

  let bookData = []; // Store parsed data

  function handleFiles(files) {
    if (files.length === 0) return;

    const file = files[0];
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      parseExcel(file);
    } else {
      showStatus('Please upload a CSV or Excel file.', 'error');
    }
  }

  function parseCSV(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        processFileData(results.data);
      },
      error: function(error) {
        showStatus('Error parsing CSV: ' + error.message, 'error');
      }
    });
  }

  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        processFileData(json);
      } catch (error) {
        showStatus('Error parsing Excel file: ' + error.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function processFileData(data) {
    if (data.length === 0) {
      showStatus('No data found in the file.', 'error');
      return;
    }

    console.log("Parsed data:", data);

    // Pre-normalize keys to lowercase for validation
    const firstRow = {};
    Object.keys(data[0]).forEach(key => {
      firstRow[key.toLowerCase()] = data[0][key];
    });

    // Validate data has required fields (case-insensitive)
    const requiredFields = ['isbn', 'title', 'author', 'publisher'];
    const missingFields = requiredFields.filter(field =>
      !Object.keys(firstRow).some(key => key.toLowerCase() === field)
    );

    if (missingFields.length > 0) {
      showStatus(`Missing required fields: ${missingFields.join(', ')}`, 'error');
      console.error("Available fields:", Object.keys(data[0]));
      console.error("Missing fields:", missingFields);
      return;
    }

    // Normalize field names (handle case differences)
    bookData = data.map(item => {
      const normalized = {};

      // Initialize with default empty values for all required fields
      normalized.isbn = "";
      normalized.title = "";
      normalized.author = "";
      normalized.publisher = "";
      normalized.publicationYear = null;
      normalized.genres = "";
      normalized.description = "";
      normalized.language = "English";
      normalized.pageCount = null;

      // Process each field from the input data
      Object.keys(item).forEach(key => {
        const lowerKey = key.toLowerCase();

        // Match fields regardless of case
        if (lowerKey === 'isbn') normalized.isbn = item[key];
        else if (lowerKey === 'title') normalized.title = item[key];
        else if (lowerKey === 'author') normalized.author = item[key];
        else if (lowerKey === 'publisher') normalized.publisher = item[key];
        else if (lowerKey === 'publicationyear' || lowerKey === 'year' || lowerKey === 'publication year')
          normalized.publicationYear = item[key];
        else if (lowerKey === 'genres' || lowerKey === 'genre') normalized.genres = item[key];
        else if (lowerKey === 'description') normalized.description = item[key];
        else if (lowerKey === 'language') normalized.language = item[key];
        else if (lowerKey === 'pagecount' || lowerKey === 'pages' || lowerKey === 'page count')
          normalized.pageCount = item[key];
        else normalized[lowerKey] = item[key]; // Keep other fields
      });

      return normalized;
    });

    console.log("Normalized data:", bookData);

    // Display preview
    displayPreview(bookData);
  }

  function displayPreview(data) {
    // Show preview container
    previewContainer.classList.remove('hidden');
    previewCount.textContent = Math.min(10, data.length);
    totalCount.textContent = data.length;

    // Clear existing table
    previewTable.innerHTML = '';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headerFields = ['ISBN', 'Title', 'Author', 'Publisher', 'Year', 'Genre'];

    headerFields.forEach(field => {
      const th = document.createElement('th');
      th.textContent = field;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    previewTable.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    // Display first 10 books only
    const previewData = data.slice(0, 10);

    previewData.forEach(book => {
      const row = document.createElement('tr');

      // Add book details
      row.appendChild(createCell(book.isbn));
      row.appendChild(createCell(book.title));
      row.appendChild(createCell(book.author));
      row.appendChild(createCell(book.publisher));
      row.appendChild(createCell(book.publicationYear));
      row.appendChild(createCell(book.genres));

      tbody.appendChild(row);
    });

    previewTable.appendChild(tbody);
  }

  function createCell(content) {
    const cell = document.createElement('td');
    cell.textContent = content || '-';
    return cell;
  }

  // Cancel upload
  cancelUpload.addEventListener('click', () => {
    previewContainer.classList.add('hidden');
    bookData = [];
    fileUploadInput.value = '';
  });

  // Upload to database
  uploadToDatabase.addEventListener('click', async () => {
    if (bookData.length === 0) {
      showStatus('No data to upload.', 'error');
      return;
    }

    // Hide preview, show progress
    previewContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressStatus.textContent = `Preparing to upload ${bookData.length} books...`;

    try {
      // Debug: Verify DB connection before upload
      console.log("Firebase DB object:", db);
      console.log("Testing collection access...");

      // Get a reference to the books collection
      const booksCollection = collection(db, 'books');
      console.log("Books collection reference:", booksCollection);

      // Start upload process
      await uploadBooks(bookData);
      showStatus(`Successfully uploaded ${bookData.length} books to the database.`, 'success');
    } catch (error) {
      console.error("Full error details:", error);
      showStatus('Error uploading books: ' + error.message, 'error');
    } finally {
      progressContainer.classList.add('hidden');
      bookData = [];
      fileUploadInput.value = '';
    }
  });

  async function uploadBooks(books) {
    const booksCollection = collection(db, 'books');
    console.log("Starting upload of", books.length, "books");

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      console.log(`Processing book ${i+1}/${books.length}:`, book.title);

      // Update progress
      const progress = Math.round(((i + 1) / books.length) * 100);
      progressBar.style.width = `${progress}%`;
      progressStatus.textContent = `Uploading book ${i + 1} of ${books.length}...`;

      try {
        // Check if book already exists (by ISBN)
        console.log("Checking if book exists with ISBN:", book.isbn);
        const bookQuery = query(booksCollection, where("isbn", "==", book.isbn));
        const existingBooks = await getDocs(bookQuery);

        if (!existingBooks.empty) {
          console.log("Book with ISBN", book.isbn, "already exists, skipping");
          continue;
        }

        // Attempt to fetch cover image
        fetchCoverStatus.textContent = `Fetching cover for "${book.title}"...`;
        let coverUrl = await fetchBookCoverByISBN(book.isbn);
        console.log("Cover URL fetched:", coverUrl);

        // Prepare book data for Firestore
        const bookData = {
          isbn: book.isbn,
          title: book.title,
          author: parseAuthors(book.author),
          publisher: book.publisher,
          publicationYear: book.publicationYear ? parseInt(book.publicationYear) : null,
          genres: parseGenres(book.genres),
          description: book.description || "",
          language: book.language || "English",
          pageCount: book.pageCount ? parseInt(book.pageCount) : null,
          coverUrl: coverUrl,
          addedDate: new Date(),
          addedBy: getCurrentUser().uid
        };

        console.log("Prepared book data:", bookData);

        // Add book to Firestore using explicit ID (combining ISBN with a timestamp)
        const bookDocId = `book_${book.isbn}_${Date.now()}`;
        const bookDocRef = doc(db, 'books', bookDocId);
        await setDoc(bookDocRef, bookData);
        console.log("Book added with ID:", bookDocId);

      } catch (error) {
        console.error(`Error processing book ${book.title}:`, error);
        // Continue with next book instead of stopping the entire process
        fetchCoverStatus.textContent = `Error with "${book.title}": ${error.message}`;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Download template
  downloadTemplate.addEventListener('click', (e) => {
    e.preventDefault();

    // Create template data
    const templateData = [
      {
        ISBN: '9781234567890',
        title: 'Sample Book Title',
        author: 'Author Name',
        publisher: 'Publisher Name',
        publicationYear: '2023',
        genres: 'Fiction, Fantasy',
        description: 'This is a sample book description.',
        language: 'English',
        pageCount: '300'
      }
    ];

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Book Template');

    // Generate and download file
    XLSX.writeFile(wb, 'book_template.xlsx');
  });

  // Manual Book Addition
  // Fetch Book Info by ISBN
  fetchBookInfo.addEventListener('click', async () => {
    const isbn = document.getElementById('isbn').value.trim();
    if (!isbn) {
      showStatus('Please enter an ISBN.', 'error');
      return;
    }

    try {
      showStatus('Fetching book information...', 'info');
      const bookInfo = await fetchBookInfoByISBN(isbn);

      if (bookInfo) {
        // Fill form with fetched data
        document.getElementById('title').value = bookInfo.title || '';
        document.getElementById('author').value = bookInfo.authors || '';
        document.getElementById('publisher').value = bookInfo.publisher || '';
        document.getElementById('publicationYear').value = bookInfo.publishedDate || '';
        document.getElementById('genres').value = bookInfo.categories || '';
        document.getElementById('description').value = bookInfo.description || '';
        document.getElementById('pageCount').value = bookInfo.pageCount || '';

        // Also fetch cover
        if (bookInfo.coverUrl) {
          displayCoverImage(bookInfo.coverUrl);
        }

        showStatus('Book information fetched successfully.', 'success');
      } else {
        showStatus('No information found for this ISBN.', 'warning');
      }
    } catch (error) {
      showStatus('Error fetching book information: ' + error.message, 'error');
    }
  });

  // Fetch Cover
  fetchCover.addEventListener('click', async () => {
    const isbn = document.getElementById('isbn').value.trim();
    if (!isbn) {
      showStatus('Please enter an ISBN.', 'error');
      return;
    }

    try {
      showStatus('Fetching book cover...', 'info');
      const coverUrl = await fetchBookCoverByISBN(isbn);

      if (coverUrl) {
        displayCoverImage(coverUrl);
        showStatus('Book cover fetched successfully.', 'success');
      } else {
        showStatus('No cover found for this ISBN.', 'warning');
      }
    } catch (error) {
      showStatus('Error fetching book cover: ' + error.message, 'error');
    }
  });

  // Display cover image
  function displayCoverImage(url) {
    coverPreview.innerHTML = '';
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Book Cover';
    img.className = 'cover-image';
    coverPreview.appendChild(img);
  }

  // Form submission
  addBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form data
    const formData = new FormData(addBookForm);
    const bookData = {
      isbn: formData.get('isbn'),
      title: formData.get('title'),
      author: parseAuthors(formData.get('author')),
      publisher: formData.get('publisher'),
      publicationYear: formData.get('publicationYear') ? parseInt(formData.get('publicationYear')) : null,
      genres: parseGenres(formData.get('genres')),
      description: formData.get('description') || "",
      language: formData.get('language') || "English",
      pageCount: formData.get('pageCount') ? parseInt(formData.get('pageCount')) : null,
      addedDate: new Date(),
      addedBy: getCurrentUser().uid
    };

    // Validation
    if (!bookData.isbn || !bookData.title || !bookData.author || !bookData.publisher) {
      showStatus('Please fill in all required fields.', 'error');
      return;
    }

    try {
      showStatus('Adding book to database...', 'info');
      console.log("Attempting to add single book:", bookData);

      // Check if book already exists
      const booksCollection = collection(db, 'books');
      const bookQuery = query(booksCollection, where("isbn", "==", bookData.isbn));
      const existingBooks = await getDocs(bookQuery);

      if (!existingBooks.empty) {
        showStatus('A book with this ISBN already exists in the database.', 'error');
        return;
      }

      // Get cover image if exists in preview
      const coverImg = coverPreview.querySelector('img');
      if (coverImg) {
        bookData.coverUrl = coverImg.src;
      } else {
        // Try to fetch cover
        const coverUrl = await fetchBookCoverByISBN(bookData.isbn);
        if (coverUrl) {
          bookData.coverUrl = coverUrl;
        }
      }

      // Add book to database with explicit ID to avoid collection path issues
      const bookId = `book_${bookData.isbn}_${Date.now()}`;
      console.log("Creating book with ID:", bookId);
      const bookDocRef = doc(db, 'books', bookId);
      await setDoc(bookDocRef, bookData);
      console.log("Book added successfully with ID:", bookId);

      // Reset form
      addBookForm.reset();
      coverPreview.innerHTML = `
        <i class="fas fa-book"></i>
        <p>Cover image will appear here</p>
      `;

      showStatus('Book added successfully!', 'success');
    } catch (error) {
      console.error("Full error details for adding book:", error);
      showStatus('Error adding book: ' + error.message, 'error');
    }
  });

  // Helper functions
  function parseAuthors(authors) {
    if (!authors) return [];
    return authors.split(',').map(author => author.trim()).filter(author => author);
  }

  function parseGenres(genres) {
    if (!genres) return [];
    return genres.split(',').map(genre => genre.trim()).filter(genre => genre);
  }

  async function fetchBookInfoByISBN(isbn) {
    try {
      console.log("Fetching book info for ISBN:", isbn);
      // Use Google Books API
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      console.log("Google Books API response:", data);

      if (data.totalItems === 0) {
        return null;
      }

      const bookInfo = data.items[0].volumeInfo;

      return {
        title: bookInfo.title,
        authors: bookInfo.authors ? bookInfo.authors.join(', ') : '',
        publisher: bookInfo.publisher,
        publishedDate: bookInfo.publishedDate ? bookInfo.publishedDate.substring(0, 4) : '', // Extract year
        categories: bookInfo.categories ? bookInfo.categories.join(', ') : '',
        description: bookInfo.description,
        pageCount: bookInfo.pageCount,
        coverUrl: bookInfo.imageLinks ? bookInfo.imageLinks.thumbnail : null
      };
    } catch (error) {
      console.error('Error fetching book info:', error);
      return null;
    }
  }

  async function fetchBookCoverByISBN(isbn) {
    try {
      console.log("Fetching book cover for ISBN:", isbn);
      // Try Google Books API first
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const data = await response.json();
      console.log("Cover API response:", data);

      if (data.totalItems > 0 && data.items[0].volumeInfo.imageLinks) {
        return data.items[0].volumeInfo.imageLinks.thumbnail;
      }

      // If Google Books doesn't have it, try Open Library
      return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    } catch (error) {
      console.error('Error fetching book cover:', error);
      return null;
    }
  }

  function showStatus(message, type = 'info') {
    console.log(`Status (${type}):`, message);
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    statusMessage.classList.add(type);

    // Show status
    statusMessage.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 5000);
  }
});