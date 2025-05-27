// detail.js
import {
    getBookById,
    addBookToFavorites,
    removeBookFromFavorites,
    getUserData,
    getCurrentUser,
    addBookReview
} from './firebase-config.js';

// Global variables
let currentBook = null;
let isFavorite = false;
let userReviewRating = 0;

// Get book ID from URL parameter
function getBookIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Initialize page
async function initPage() {
    const bookId = getBookIdFromUrl();

    if (!bookId) {
        showError("No book ID provided");
        return;
    }

    try {
        showLoading(true);

        // Fetch book data
        const book = await getBookById(bookId);

        if (!book) {
            showError("Book not found");
            return;
        }

        currentBook = book;

        // Check if book is in user's favorites
        const user = getCurrentUser();
        if (user) {
            const userData = await getUserData(user.uid);
            if (userData && userData.favorites) {
                isFavorite = userData.favorites.includes(bookId);
                updateFavoriteButton();
            }
        }

        // Render book details
        renderBookDetails(book);

        // Set up page interactions
        setupInteractions();

        // Load related books
        loadRelatedBooks(book);

        showLoading(false);
    } catch (error) {
        console.error("Error initializing page:", error);
        showError("Failed to load book details");
    }
}

// Show/hide loading indicator
function showLoading(isLoading) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const bookDetailsContent = document.getElementById('bookDetailsContent');
    const errorMessage = document.getElementById('errorMessage');

    if (isLoading) {
        loadingIndicator.style.display = 'flex';
        bookDetailsContent.style.display = 'none';
        errorMessage.style.display = 'none';
    } else {
        loadingIndicator.style.display = 'none';
        bookDetailsContent.style.display = 'block';
    }
}

// Show error message
function showError(message) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const bookDetailsContent = document.getElementById('bookDetailsContent');
    const errorMessage = document.getElementById('errorMessage');

    loadingIndicator.style.display = 'none';
    bookDetailsContent.style.display = 'none';
    errorMessage.style.display = 'flex';

    const errorText = errorMessage.querySelector('p');
    if (errorText) {
        errorText.textContent = message || "Sorry, we couldn't find the book you're looking for.";
    }
}

// Render book details
function renderBookDetails(book) {
    // Set book cover
    const bookCover = document.getElementById('bookCover');
    bookCover.src = book.coverUrl || '/images/default-cover.jpg';
    bookCover.alt = `${book.title} cover`;

    // Set basic book info
    document.getElementById('bookTitle').textContent = book.title;

    // Set authors
    const authorsElement = document.getElementById('bookAuthors');
    if (book.authors && book.authors.length > 0) {
        authorsElement.textContent = `by ${book.authors.join(', ')}`;
    } else {
        authorsElement.textContent = 'Unknown Author';
    }

    // Set rating stars
    const ratingElement = document.getElementById('bookRating');
    const rating = book.averageRating || 0;
    renderStars(ratingElement, rating);

    // Set rating count
    const ratingCount = document.getElementById('ratingCount');
    const reviewCount = book.reviews ? book.reviews.length : 0;
    ratingCount.textContent = `(${reviewCount} reviews)`;

    // Set metadata
    document.getElementById('publisher').textContent = book.publisher || 'Unknown';
    document.getElementById('publishDate').textContent = book.publishedDate || 'Unknown';
    document.getElementById('pageCount').textContent = book.pageCount || 'Unknown';
    document.getElementById('isbn').textContent = book.isbn || 'Unknown';
    document.getElementById('language').textContent = book.language || 'Unknown';

    // Set description
    document.getElementById('bookDescription').textContent = book.description || 'No description available.';

    // Fill details table
    const detailsTable = document.getElementById('detailsTableBody');
    detailsTable.innerHTML = '';

    const details = [
        { label: 'Title', value: book.title },
        { label: 'Authors', value: book.authors ? book.authors.join(', ') : 'Unknown' },
        { label: 'Publisher', value: book.publisher || 'Unknown' },
        { label: 'Published Date', value: book.publishedDate || 'Unknown' },
        { label: 'Page Count', value: book.pageCount || 'Unknown' },
        { label: 'ISBN', value: book.isbn || 'Unknown' },
        { label: 'Language', value: book.language || 'Unknown' },
        { label: 'Average Rating', value: (book.averageRating || 0).toFixed(1) + ' out of 5' }
    ];

    details.forEach(detail => {
        const row = document.createElement('tr');

        const labelCell = document.createElement('td');
        labelCell.className = 'detail-label';
        labelCell.textContent = detail.label;

        const valueCell = document.createElement('td');
        valueCell.className = 'detail-value';
        valueCell.textContent = detail.value;

        row.appendChild(labelCell);
        row.appendChild(valueCell);
        detailsTable.appendChild(row);
    });

    // Set genres
    const genresList = document.getElementById('genresList');
    genresList.innerHTML = '';

    if (book.genres && book.genres.length > 0) {
        book.genres.forEach(genre => {
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genre;
            genresList.appendChild(genreTag);
        });
    } else {
        const noGenres = document.createElement('p');
        noGenres.textContent = 'No genres specified';
        genresList.appendChild(noGenres);
    }

    // Render reviews
    renderReviews(book);

    // Set share link
    const shareLink = document.getElementById('shareLink');
    if (shareLink) {
        shareLink.value = window.location.href;
    }
}

// Render stars for ratings
function renderStars(container, rating) {
    container.innerHTML = '';

    // Calculate full and half stars
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
        const star = document.createElement('i');
        star.className = 'fas fa-star';
        container.appendChild(star);
    }

    // Add half star if needed
    if (hasHalfStar) {
        const halfStar = document.createElement('i');
        halfStar.className = 'fas fa-star-half-alt';
        container.appendChild(halfStar);
    }

    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
        const emptyStar = document.createElement('i');
        emptyStar.className = 'far fa-star';
        container.appendChild(emptyStar);
    }
}

// Render reviews section
function renderReviews(book) {
    // Set up overall rating section
    const reviews = book.reviews || [];
    const totalReviews = reviews.length;
    let totalRating = 0;

    reviews.forEach(review => {
        totalRating += review.rating;
    });

    const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    document.getElementById('totalReviews').textContent = totalReviews;
    document.getElementById('avgRating').textContent = averageRating.toFixed(1);

    const bigRatingElement = document.querySelector('.big-rating');
    renderStars(bigRatingElement, averageRating);

    // Render individual reviews
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';

    if (totalReviews > 0) {
        // Sort reviews by date (newest first)
        const sortedReviews = [...reviews].sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        sortedReviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.className = 'review-item';

            const reviewHeader = document.createElement('div');
            reviewHeader.className = 'review-header';

            const reviewTitle = document.createElement('h4');
            reviewTitle.className = 'review-title';
            reviewTitle.textContent = review.title || 'Review';

            const reviewRating = document.createElement('div');
            reviewRating.className = 'review-rating';
            renderStars(reviewRating, review.rating);

            reviewHeader.appendChild(reviewTitle);
            reviewHeader.appendChild(reviewRating);

            const reviewContent = document.createElement('div');
            reviewContent.className = 'review-content';
            reviewContent.textContent = review.text || 'No comments provided.';

            const reviewFooter = document.createElement('div');
            reviewFooter.className = 'review-footer';

            const reviewAuthor = document.createElement('span');
            reviewAuthor.className = 'review-author';
            reviewAuthor.textContent = review.userName || 'Anonymous';

            const reviewDate = document.createElement('span');
            reviewDate.className = 'review-date';
            reviewDate.textContent = formatDate(review.createdAt);

            reviewFooter.appendChild(reviewAuthor);
            reviewFooter.appendChild(reviewDate);

            reviewElement.appendChild(reviewHeader);
            reviewElement.appendChild(reviewContent);
            reviewElement.appendChild(reviewFooter);

            reviewsList.appendChild(reviewElement);
        });
    } else {
        const noReviews = document.createElement('p');
        noReviews.className = 'no-reviews';
        noReviews.textContent = 'No reviews yet. Be the first to review this book!';
        reviewsList.appendChild(noReviews);
    }
}

// Format date for reviews
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';

    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

// Load related books
async function loadRelatedBooks(book) {
    try {
        // Ideally, we would have a dedicated endpoint for related books
        // Here, we're just using the first genre to get related books
        if (!book.genres || book.genres.length === 0) {
            displayNoRelatedBooks();
            return;
        }

        const primaryGenre = book.genres[0];
        const { getBooksByGenre } = await import('./firebase-config.js');
        const relatedBooks = await getBooksByGenre(primaryGenre, 6);

        // Filter out the current book
        const filteredBooks = relatedBooks.filter(relatedBook => relatedBook.id !== book.id);

        // Display up to 4 related books
        const booksToDisplay = filteredBooks.slice(0, 4);

        if (booksToDisplay.length === 0) {
            displayNoRelatedBooks();
            return;
        }

        renderRelatedBooks(booksToDisplay);
    } catch (error) {
        console.error("Error loading related books:", error);
        displayNoRelatedBooks();
    }
}

// Display message when no related books are found
function displayNoRelatedBooks() {
    const relatedBooksContainer = document.getElementById('relatedBooks');
    relatedBooksContainer.innerHTML = '<p class="no-related">No related books found.</p>';
}

// Render related books
function renderRelatedBooks(books) {
    const relatedBooksContainer = document.getElementById('relatedBooks');
    relatedBooksContainer.innerHTML = '';

    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'related-book-card';

        const bookLink = document.createElement('a');
        bookLink.href = `detail.html?id=${book.id}`;

        const bookCover = document.createElement('img');
        bookCover.src = book.coverUrl || '/images/default-cover.jpg';
        bookCover.alt = book.title;
        bookCover.className = 'related-book-cover';

        const bookTitle = document.createElement('h4');
        bookTitle.className = 'related-book-title';
        bookTitle.textContent = book.title;

        const bookAuthor = document.createElement('p');
        bookAuthor.className = 'related-book-author';
        bookAuthor.textContent = book.authors ? book.authors[0] : 'Unknown Author';

        bookLink.appendChild(bookCover);
        bookLink.appendChild(bookTitle);
        bookLink.appendChild(bookAuthor);

        bookCard.appendChild(bookLink);
        relatedBooksContainer.appendChild(bookCard);
    });
}

// Set up page interactions
function setupInteractions() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all tabs
            tabButtons.forEach(tab => tab.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Hide all tab panes
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Show selected tab pane
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Share button
    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');
    const closeModal = document.querySelector('.close-modal');

    if (shareBtn && shareModal) {
        shareBtn.addEventListener('click', function() {
            shareModal.style.display = 'flex';
        });

        closeModal.addEventListener('click', function() {
            shareModal.style.display = 'none';
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === shareModal) {
                shareModal.style.display = 'none';
            }
        });
    }

    // Copy link button
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareLink = document.getElementById('shareLink');

    if (copyLinkBtn && shareLink) {
        copyLinkBtn.addEventListener('click', function() {
            shareLink.select();
            document.execCommand('copy');
            showToast('Link copied to clipboard!');
        });
    }

    // Set up favorite button
    const favoriteBtn = document.getElementById('favoriteBtn');

    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
    }

    // Set up add to library button
    const addToLibraryBtn = document.getElementById('addToLibraryBtn');

    if (addToLibraryBtn) {
        addToLibraryBtn.addEventListener('click', function() {
            const user = getCurrentUser();

            if (!user) {
                showToast('Please sign in to add books to your library', true);
                return;
            }

            // This functionality would typically be implemented with a separate collection
            // For this demo, we'll just show a success message
            showToast('Book added to your library!');
        });
    }

    // Set up review form
    const writeReviewBtn = document.getElementById('writeReviewBtn');
    const reviewForm = document.getElementById('reviewForm');
    const cancelReviewBtn = document.getElementById('cancelReviewBtn');
    const starRating = document.querySelectorAll('.star-rating .far.fa-star');

    if (writeReviewBtn && reviewForm) {
        writeReviewBtn.addEventListener('click', function() {
            const user = getCurrentUser();

            if (!user) {
                showToast('Please sign in to write a review', true);
                return;
            }

            reviewForm.style.display = 'block';
        });

        cancelReviewBtn.addEventListener('click', function() {
            reviewForm.style.display = 'none';
            resetReviewForm();
        });

        // Star rating functionality
        starRating.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.getAttribute('data-rating'));
                userReviewRating = rating;

                // Update stars display
                starRating.forEach((s, index) => {
                    if (index < rating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });

            // Hover effects
            star.addEventListener('mouseover', function() {
                const rating = parseInt(this.getAttribute('data-rating'));

                starRating.forEach((s, index) => {
                    if (index < rating) {
                        s.className = 'fas fa-star';
                    }
                });
            });

            star.addEventListener('mouseout', function() {
                starRating.forEach((s, index) => {
                    if (index < userReviewRating) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
            });
        });

        // Submit review
        const submitReviewBtn = document.getElementById('submitReviewBtn');

        submitReviewBtn.addEventListener('click', submitReview);
    }
}

// Toggle favorite status
async function toggleFavorite() {
    const user = getCurrentUser();

    if (!user) {
        showToast('Please sign in to add favorites', true);
        return;
    }

    if (!currentBook) {
        showToast('Book information not available', true);
        return;
    }

    try {
        if (isFavorite) {
            await removeBookFromFavorites(user.uid, currentBook.id);
            isFavorite = false;
            showToast('Book removed from favorites');
        } else {
            await addBookToFavorites(user.uid, currentBook.id);
            isFavorite = true;
            showToast('Book added to favorites');
        }

        updateFavoriteButton();
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showToast('Failed to update favorites', true);
    }
}

// Update favorite button appearance
function updateFavoriteButton() {
    const favoriteBtn = document.getElementById('favoriteBtn');

    if (!favoriteBtn) return;

    const iconElement = favoriteBtn.querySelector('i');

    if (isFavorite) {
        iconElement.className = 'fas fa-heart';
        favoriteBtn.title = 'Remove from favorites';
    } else {
        iconElement.className = 'far fa-heart';
        favoriteBtn.title = 'Add to favorites';
    }
}

// Submit a review
async function submitReview() {
    const user = getCurrentUser();

    if (!user) {
        showToast('Please sign in to submit a review', true);
        return;
    }

    if (!currentBook) {
        showToast('Book information not available', true);
        return;
    }

    const reviewTitle = document.getElementById('reviewTitle').value.trim();
    const reviewText = document.getElementById('reviewText').value.trim();

    if (userReviewRating === 0) {
        showToast('Please select a rating', true);
        return;
    }

    if (!reviewTitle) {
        showToast('Please provide a review title', true);
        return;
    }

    if (!reviewText) {
        showToast('Please write your review', true);
        return;
    }

    try {
        const reviewData = {
            userId: user.uid,
            userName: user.displayName || user.email.split('@')[0],
            rating: userReviewRating,
            title: reviewTitle,
            text: reviewText
        };

        await addBookReview(currentBook.id, reviewData);

        showToast('Review submitted successfully');

        // Reset and hide form
        document.getElementById('reviewForm').style.display = 'none';
        resetReviewForm();

        // Refresh book data
        const book = await getBookById(currentBook.id);
        currentBook = book;
        renderReviews(book);

        // Update overall rating
        const ratingElement = document.getElementById('bookRating');
        const rating = book.averageRating || 0;
        renderStars(ratingElement, rating);

        const ratingCount = document.getElementById('ratingCount');
        const reviewCount = book.reviews ? book.reviews.length : 0;
        ratingCount.textContent = `(${reviewCount} reviews)`;
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Failed to submit review', true);
    }
}

// Reset review form
function resetReviewForm() {
    document.getElementById('reviewTitle').value = '';
    document.getElementById('reviewText').value = '';
    userReviewRating = 0;

    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
        star.className = 'far fa-star';
    });
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    toastMessage.textContent = message;

    if (isError) {
        toastIcon.className = 'fas fa-exclamation-circle';
        toast.classList.add('error');
    } else {
        toastIcon.className = 'fas fa-check-circle';
        toast.classList.remove('error');
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);