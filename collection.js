// collection.js
import {
  auth,
  onAuthStateChanged,
  isAuthenticated,
  getBooks,
  searchBooks,
  db,
  collection,
  getDocs
} from './firebase-config.js';

// DOM Elements
const booksGrid = document.getElementById('booksGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const authCheckMessage = document.getElementById('authCheckMessage');
const noResultsMessage = document.getElementById('noResultsMessage');
const genreFiltersContainer = document.getElementById('genreFilters');
const searchInput = document.getElementById('searchInput');
const inlineSearchInput = document.getElementById('inlineSearchInput');
const inlineSearchBtn = document.getElementById('inlineSearchBtn');
const searchBtn = document.getElementById('searchBtn');
const resetSearchBtn = document.getElementById('resetSearchBtn');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const userDisplayName = document.getElementById('userDisplayName');
const guestOptions = document.getElementById('guest-options');
const userOptions = document.getElementById('user-options');
const signOutBtn = document.getElementById('signOutBtn');

// State variables
let allBooks = [];
let filteredBooks = [];
let allGenres = [];
let activeFilters = {
  genres: [],
  searchTerm: ''
};
let currentSort = {
  field: 'addedDate',
  direction: 'desc'
};

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupAuthListener();
});

// Setup event listeners
function setupEventListeners() {
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');

  menuToggle.addEventListener('click', (e) => {
    e.preventDefault();
    mobileMenu.classList.toggle('active');
  });

  // User dropdown toggle
  const userIcon = document.querySelector('.user-icon');
  const userDropdown = document.querySelector('.user-dropdown');

  userIcon.addEventListener('click', (e) => {
    e.preventDefault();
    userDropdown.classList.toggle('active');
  });

  // Search overlay toggle
  const searchToggle = document.querySelector('.search-toggle');
  const searchOverlay = document.querySelector('.search-overlay');
  const closeSearch = document.querySelector('.close-search');

  searchToggle.addEventListener('click', (e) => {
    e.preventDefault();
    searchOverlay.classList.add('active');
    searchInput.focus();
  });

  closeSearch.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
  });

  // Filter dropdown toggle
  const filterButton = document.querySelector('.filter-button');
  const filterDropdown = document.querySelector('.filter-dropdown');

  filterButton.addEventListener('click', () => {
    filterDropdown.classList.toggle('active');
  });

  // Sort dropdown toggle
  const sortButton = document.querySelector('.sort-button');
  const sortDropdown = document.querySelector('.sort-dropdown');

  sortButton.addEventListener('click', () => {
    sortDropdown.classList.toggle('active');
  });

  // Sort options
  const sortOptions = document.querySelectorAll('.sort-option');

  sortOptions.forEach(option => {
    option.addEventListener('click', () => {
      const sortField = option.getAttribute('data-sort');
      const sortDirection = option.getAttribute('data-direction');

      // Update active sort option visually
      sortOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      // Update current sort and resort books
      currentSort = { field: sortField, direction: sortDirection };
      sortBooks();
      renderBooks();

      // Close dropdown
      sortDropdown.classList.remove('active');
    });
  });

  // Search functionality
  searchBtn.addEventListener('click', () => {
    handleSearch(searchInput.value);
    searchOverlay.classList.remove('active');
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchInput.value);
      searchOverlay.classList.remove('active');
    }
  });

  inlineSearchBtn.addEventListener('click', () => {
    handleSearch(inlineSearchInput.value);
  });

  inlineSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch(inlineSearchInput.value);
    }
  });

  resetSearchBtn.addEventListener('click', resetFiltersAndSearch);

  // Filter actions
  applyFiltersBtn.addEventListener('click', applyFilters);
  clearFiltersBtn.addEventListener('click', clearFilters);

  // Sign out button
  if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      auth.signOut()
        .then(() => {
          console.log('User signed out');
          window.location.href = 'signin.html';
        })
        .catch(error => {
          console.error('Error signing out:', error);
        });
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-dropdown') && !e.target.closest('.filter-button')) {
      filterDropdown.classList.remove('active');
    }
    if (!e.target.closest('.sort-dropdown') && !e.target.closest('.sort-button')) {
      sortDropdown.classList.remove('active');
    }
    if (!e.target.closest('.user-dropdown') && !e.target.closest('.user-icon')) {
      userDropdown.classList.remove('active');
    }
    if (!e.target.closest('.mobile-menu') && !e.target.closest('.menu-toggle-container')) {
      mobileMenu.classList.remove('active');
    }
  });
}

// Handle authentication state changes
function setupAuthListener() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      console.log('User is signed in:', user.uid);
      handleAuthenticatedUser(user);
    } else {
      // User is signed out
      console.log('User is signed out');
      handleUnauthenticatedUser();
    }
  });
}

// Handle authenticated user
function handleAuthenticatedUser(user) {
  // Update UI for authenticated user
  if (userDisplayName) {
    userDisplayName.textContent = user.displayName || user.email || 'User';
  }
  if (guestOptions && userOptions) {
    guestOptions.style.display = 'none';
    userOptions.style.display = 'block';
  }

  // Hide auth check message if visible
  if (authCheckMessage) {
    authCheckMessage.style.display = 'none';
  }

  // Load books
  loadBooks();
}

// Handle unauthenticated user
function handleUnauthenticatedUser() {
  // Update UI for guest
  if (userDisplayName) {
    userDisplayName.textContent = 'Account';
  }
  if (guestOptions && userOptions) {
    guestOptions.style.display = 'block';
    userOptions.style.display = 'none';
  }

  // Show auth check message
  if (authCheckMessage) {
    authCheckMessage.style.display = 'flex';
  }

  // Hide loading indicator and books collection
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  if (booksGrid) {
    booksGrid.style.display = 'none';
  }
}

// Load genres from database
async function loadGenres() {
  try {
    // We'll collect unique genres from the books
    const uniqueGenres = new Set();

    allBooks.forEach(book => {
      if (book.genres && Array.isArray(book.genres)) {
        book.genres.forEach(genre => uniqueGenres.add(genre));
      }
    });

    allGenres = Array.from(uniqueGenres).sort();

    // Populate genre filters
    if (genreFiltersContainer) {
      genreFiltersContainer.innerHTML = '';

      allGenres.forEach(genre => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'filter-checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `genre-${genre.replace(/\s+/g, '-').toLowerCase()}`;
        checkbox.value = genre;

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = genre;

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        genreFiltersContainer.appendChild(checkboxDiv);
      });
    }
  } catch (error) {
    console.error('Error loading genres:', error);
  }
}

// Load books from database
async function loadBooks() {
  if (!isAuthenticated()) {
    return;
  }

  try {
    // Show loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }

    // Get books from Firebase
    allBooks = await getBooks(100, currentSort.field, currentSort.direction);
    filteredBooks = [...allBooks];

    // Load genres for filters
    await loadGenres();

    // Render books
    renderBooks();

    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading books:', error);

    // Hide loading indicator on error
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

// Render books to the grid
function renderBooks() {
  if (!booksGrid) return;

  booksGrid.innerHTML = '';

  if (filteredBooks.length === 0) {
    // Show no results message
    if (noResultsMessage) {
      noResultsMessage.style.display = 'block';
    }
    return;
  }

  // Hide no results message if visible
  if (noResultsMessage) {
    noResultsMessage.style.display = 'none';
  }

  // Create book elements
  filteredBooks.forEach(book => {
    const bookElement = createBookElement(book);
    booksGrid.appendChild(bookElement);
  });
}

// Create book element
function createBookElement(book) {
  const bookItem = document.createElement('div');
  bookItem.className = 'book-item glass-effect';

  // Book cover
  const bookCover = document.createElement('div');
  bookCover.className = 'book-cover';

  const coverImg = document.createElement('img');
  coverImg.src = book.coverUrl || '/img/default-cover.jpg';
  coverImg.alt = `${book.title} cover`;
  coverImg.onerror = function() {
    this.src = '/img/default-cover.jpg';
  };

  bookCover.appendChild(coverImg);

  // Book overlay with button
  const bookOverlay = document.createElement('div');
  bookOverlay.className = 'book-overlay';

  const viewButton = document.createElement('a');
  // Update the link to point to detail.html with book ID
  viewButton.href = `detail.html?id=${book.id}`;
  viewButton.className = 'overlay-btn';
  viewButton.textContent = 'View Details';

  bookOverlay.appendChild(viewButton);
  bookCover.appendChild(bookOverlay);

  // Book info
  const bookInfo = document.createElement('div');
  bookInfo.className = 'book-info';

  const title = document.createElement('h3');
  title.className = 'book-title';
  title.textContent = book.title;

  const author = document.createElement('p');
  author.className = 'book-author';
  author.textContent = Array.isArray(book.author)
    ? book.author.join(', ')
    : (book.author || 'Unknown author');

  bookInfo.appendChild(title);
  bookInfo.appendChild(author);

  // Book genres
  if (book.genres && book.genres.length > 0) {
    const genresDiv = document.createElement('div');
    genresDiv.className = 'book-genres';

    // Display up to 3 genres
    book.genres.slice(0, 3).forEach(genre => {
      const genreSpan = document.createElement('span');
      genreSpan.className = 'book-genre';
      genreSpan.textContent = genre;
      genresDiv.appendChild(genreSpan);
    });

    bookInfo.appendChild(genresDiv);
  }

  // Assemble book item
  bookItem.appendChild(bookCover);
  bookItem.appendChild(bookInfo);

  // Update the click event to navigate to detail.html with book ID
  bookItem.addEventListener('click', () => {
    window.location.href = `detail.html?id=${book.id}`;
  });

  return bookItem;
}

// Handle search
function handleSearch(searchTerm) {
  activeFilters.searchTerm = searchTerm.trim();

  if (searchTerm.trim() === '') {
    // If search is empty, reset to all books
    filteredBooks = [...allBooks];
  } else {
    // Filter books by search term
    filteredBooks = allBooks.filter(book => {
      const title = book.title ? book.title.toLowerCase() : '';
      const authors = Array.isArray(book.author)
        ? book.author.join(' ').toLowerCase()
        : ((book.author || '').toLowerCase());
      const isbn = book.isbn ? book.isbn.toLowerCase() : '';
      const searchLower = searchTerm.toLowerCase();

      return title.includes(searchLower) ||
             authors.includes(searchLower) ||
             isbn.includes(searchLower);
    });
  }

  // Apply any active genre filters
  applyGenreFilters();

  // Update both search inputs to show the same value
  if (searchInput) searchInput.value = searchTerm;
  if (inlineSearchInput) inlineSearchInput.value = searchTerm;

  // Render filtered books
  renderBooks();
}

// Apply filters
function applyFilters() {
  // Get selected genres
  const selectedGenres = [];
  const genreCheckboxes = document.querySelectorAll('#genreFilters input[type="checkbox"]');

  genreCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selectedGenres.push(checkbox.value);
    }
  });

  activeFilters.genres = selectedGenres;

  // Apply genre filters
  applyGenreFilters();

  // Close filter dropdown
  document.querySelector('.filter-dropdown').classList.remove('active');

  // Render filtered books
  renderBooks();
}

// Apply genre filters
function applyGenreFilters() {
  if (activeFilters.genres.length === 0) {
    // If no genre filters, keep the current filtered books (which might be filtered by search)
    return;
  }

  // Filter by genres
  filteredBooks = filteredBooks.filter(book => {
    if (!book.genres || !Array.isArray(book.genres)) {
      return false;
    }

    // Check if book has any of the selected genres
    return activeFilters.genres.some(genre => book.genres.includes(genre));
  });
}

// Clear filters
function clearFilters() {
  // Uncheck all genre checkboxes
  const genreCheckboxes = document.querySelectorAll('#genreFilters input[type="checkbox"]');
  genreCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });

  activeFilters.genres = [];

  // Reset to all books if there's no search term
  if (activeFilters.searchTerm === '') {
    filteredBooks = [...allBooks];
  } else {
    // Re-apply only the search filter
    handleSearch(activeFilters.searchTerm);
  }

  // Render books
  renderBooks();
}

// Reset filters and search
function resetFiltersAndSearch() {
  // Clear search inputs
  if (searchInput) searchInput.value = '';
  if (inlineSearchInput) inlineSearchInput.value = '';

  activeFilters.searchTerm = '';
  activeFilters.genres = [];

  // Uncheck all genre checkboxes
  const genreCheckboxes = document.querySelectorAll('#genreFilters input[type="checkbox"]');
  genreCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });

  // Reset to all books
  filteredBooks = [...allBooks];

  // Render books
  renderBooks();

  // Hide no results message
  if (noResultsMessage) {
    noResultsMessage.style.display = 'none';
  }
}

// Sort books
function sortBooks() {
  filteredBooks.sort((a, b) => {
    let valueA, valueB;

    // Get values based on sort field
    if (currentSort.field === 'title') {
      valueA = a.title ? a.title.toLowerCase() : '';
      valueB = b.title ? b.title.toLowerCase() : '';
    } else if (currentSort.field === 'addedDate') {
      valueA = a.addedDate ? new Date(a.addedDate).getTime() : 0;
      valueB = b.addedDate ? new Date(b.addedDate).getTime() : 0;
    } else {
      valueA = a[currentSort.field];
      valueB = b[currentSort.field];
    }

    // Handle ascending or descending
    if (currentSort.direction === 'asc') {
      return valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
    } else {
      return valueA > valueB ? -1 : (valueA < valueB ? 1 : 0);
    }
  });
}