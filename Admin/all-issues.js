// all-issues.js
import {
  db,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize variables
  let currentPage = 1;
  const itemsPerPage = 10;
  let allIssues = [];
  let filteredIssues = [];
  let totalPages = 0;

  // DOM Elements
  const issuesTableBody = document.getElementById('issuesTableBody');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const statusFilter = document.getElementById('statusFilter');
  const dateFilter = document.getElementById('dateFilter');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const applyDateRangeBtn = document.getElementById('applyDateRange');
  const refreshTableBtn = document.getElementById('refreshTable');
  const exportDataBtn = document.getElementById('exportData');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const pageNumbersContainer = document.getElementById('pageNumbers');
  const startRangeSpan = document.getElementById('startRange');
  const endRangeSpan = document.getElementById('endRange');
  const totalItemsSpan = document.getElementById('totalItems');

  // Return Modal Elements
  const returnModal = document.getElementById('returnModal');
  const modalBookCover = document.getElementById('modalBookCover');
  const modalBookTitle = document.getElementById('modalBookTitle');
  const modalBookAuthor = document.getElementById('modalBookAuthor');
  const modalIsbn = document.getElementById('modalIsbn');
  const modalUserName = document.getElementById('modalUserName');
  const modalMembershipId = document.getElementById('modalMembershipId');
  const modalIssueDate = document.getElementById('modalIssueDate');
  const modalReturnDate = document.getElementById('modalReturnDate');
  const actualReturnDateInput = document.getElementById('actualReturnDate');
  const returnConditionSelect = document.getElementById('returnCondition');
  const returnNotesTextarea = document.getElementById('returnNotes');
  const confirmReturnBtn = document.getElementById('confirmReturn');
  const cancelReturnBtn = document.getElementById('cancelReturn');

  // View Issue Modal Elements - Create if not exists
  const viewModal = document.getElementById('viewModal') || createViewModal();

  // Success and Error Modals
  const successModal = document.getElementById('successModal');
  const successMessage = document.getElementById('successMessage');
  const successOkButton = document.getElementById('successOkButton');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const errorOkButton = document.getElementById('errorOkButton');

  // Initialize date inputs with current date
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  actualReturnDateInput.value = formattedDate;
  startDateInput.value = formattedDate;
  endDateInput.value = formattedDate;

  // Initialize
  loadIssues();

  // Event Listeners
  searchBtn.addEventListener('click', filterIssues);
  searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      filterIssues();
    }
  });
  statusFilter.addEventListener('change', filterIssues);
  dateFilter.addEventListener('change', filterIssues);
  applyDateRangeBtn.addEventListener('click', filterIssues);
  refreshTableBtn.addEventListener('click', loadIssues);
  prevPageBtn.addEventListener('click', () => changePage(currentPage - 1));
  nextPageBtn.addEventListener('click', () => changePage(currentPage + 1));
  exportDataBtn.addEventListener('click', exportIssuesToCSV);

  // Return Modal events
  cancelReturnBtn.addEventListener('click', closeModals);
  confirmReturnBtn.addEventListener('click', processBookReturn);

  // Success and Error Modal events
  successOkButton.addEventListener('click', closeModals);
  errorOkButton.addEventListener('click', closeModals);

  // Close modal when clicking on X or outside the modal
  document.querySelectorAll('.modal .close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModals);
  });
  window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      closeModals();
    }
  });

  // Create View Modal if it doesn't exist
  function createViewModal() {
    const modal = document.createElement('div');
    modal.id = 'viewModal';
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content glass-effect">
        <div class="modal-header">
          <h3><i class="fas fa-info-circle"></i> Issue Details</h3>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          <div class="modal-book-info">
            <img id="viewModalBookCover" src="/api/placeholder/120/180" alt="Book cover">
            <div>
              <h4 id="viewModalBookTitle">Book Title</h4>
              <p id="viewModalBookAuthor">Author Name</p>
              <p id="viewModalIsbn">ISBN: 0000000000000</p>
            </div>
          </div>
          <div class="modal-user-info">
            <p><strong>Issued To:</strong> <span id="viewModalUserName">User Name</span></p>
            <p><strong>User ID:</strong> <span id="viewModalMembershipId">LIB-000000</span></p>
            <p><strong>Email:</strong> <span id="viewModalUserEmail">user@example.com</span></p>
            <p><strong>Phone:</strong> <span id="viewModalUserPhone">N/A</span></p>
          </div>
          <div class="issue-details">
            <p><strong>Issue Date:</strong> <span id="viewModalIssueDate">2025-00-00</span></p>
            <p><strong>Due Date:</strong> <span id="viewModalReturnDate">2025-00-00</span></p>
            <p><strong>Status:</strong> <span id="viewModalStatus" class="status-badge">Status</span></p>
            <div id="returnDetailsSection" class="return-details-view">
              <h4>Return Details</h4>
              <p><strong>Actual Return Date:</strong> <span id="viewModalActualReturnDate">N/A</span></p>
              <p><strong>Condition on Return:</strong> <span id="viewModalCondition">N/A</span></p>
              <p><strong>Notes:</strong> <span id="viewModalNotes">N/A</span></p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="button dark" id="viewCloseButton">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listener for close button
    const viewCloseButton = document.getElementById('viewCloseButton');
    if (viewCloseButton) {
      viewCloseButton.addEventListener('click', closeModals);
    }

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModals);
    }

    return modal;
  }

  // Main Functions
  async function loadIssues() {
    try {
      showLoading();

      // Get all bookIssuess documents
      const issuesCollection = collection(db, 'bookIssues');
      const issuesQuery = query(issuesCollection, orderBy('issueTimestamp', 'desc'));
      const querySnapshot = await getDocs(issuesQuery);

      allIssues = await Promise.all(querySnapshot.docs.map(async doc => {
        const issueData = doc.data();
        let bookData = {...issueData};

        // Get default cover URL
        let coverUrl = '/api/placeholder/200/300';

        // If there's a bookId reference, fetch the book data to get cover
        if (issueData.bookId) {
          try {
            const bookDoc = await getDoc(doc(db, 'books', issueData.bookId));
            if (bookDoc.exists()) {
              // Get the book document data
              const bookDocData = bookDoc.data();

              // Look for cover URL in book data
              if (bookDocData.coverUrl) coverUrl = bookDocData.coverUrl;
              else if (bookData.coverURL) coverUrl = bookData.coverURL;
              else if (bookDocData.imageURL) coverUrl = bookDocData.imageURL;

              // Merge book data but prioritize issue data for overlapping fields
              bookData = {
                ...bookDocData,
                ...issueData,
                coverUrl: coverUrl  // Set the found cover URL
              };
            }
          } catch (err) {
            console.warn(`Could not fetch book details for ${issueData.bookId}:`, err);
          }
        } else {
          // Try to find cover URL in issue data if no book ID
          if (issueData.coverUrl) coverUrl = issueData.coverUrl;
          else if (issueData.coverURL) coverUrl = issueData.coverURL;
          bookData.coverUrl = coverUrl;
        }

        // Make sure the URL starts with a valid path
        if (bookData.coverUrl && typeof bookData.coverUrl === 'string' &&
            !bookData.coverUrl.startsWith('http') && !bookData.coverUrl.startsWith('/')) {
          bookData.coverUrl = '/' + bookData.coverUrl;
        }

        return {
          id: doc.id,
          ...bookData,
          // Ensure these fields exist
          bookTitle: bookData.bookTitle || bookData.title || 'Unknown Title',
          bookIsbn: bookData.bookIsbn || bookData.isbn || 'N/A',
          bookAuthor: bookData.bookAuthor || bookData.author || 'Unknown',
          personal: bookData.personal || {},
          membershipId: bookData.membershipId || 'N/A',
          status: bookData.status || 'unknown',
        };

      }));

      // Filter issues based on current filters
      filteredIssues = [...allIssues];
      filterIssues();

    } catch (error) {
      console.error("Error loading issues:", error);
      showError("Failed to load issues. Please try again later.");
    }
  }

  // Add a helper function to validate issue data structure


  function filterIssues() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;
    const dateRange = dateFilter.value;

    // Apply filters
    filteredIssues = allIssues.filter(issue => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        (issue.bookTitle && issue.bookTitle.toLowerCase().includes(searchTerm)) ||
        (issue.bookIsbn && issue.bookIsbn.toLowerCase().includes(searchTerm)) ||
        (issue.membershipId && issue.membershipId.toLowerCase().includes(searchTerm)) ||
        (issue.fullName && issue.fullName.toLowerCase().includes(searchTerm));

      // Status filter
      const matchesStatus =
        status === 'all' ||
        (status === 'issued' && issue.status === 'issued') ||
        (status === 'returned' && issue.status === 'returned') ||
        (status === 'overdue' && issue.status === 'issued' && isOverdue(issue));

      // Date filter
      let matchesDate = true;
      if (dateRange !== 'all') {
        const issueDate = new Date(issue.issueDate);
        const today = new Date();

        if (dateRange === 'today') {
          matchesDate = isSameDay(issueDate, today);
        } else if (dateRange === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          matchesDate = issueDate >= weekAgo;
        } else if (dateRange === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          matchesDate = issueDate >= monthAgo;
        } else if (dateRange === 'custom') {
          const startDate = new Date(startDateInput.value);
          const endDate = new Date(endDateInput.value);
          endDate.setHours(23, 59, 59); // Include the entire end day
          matchesDate = issueDate >= startDate && issueDate <= endDate;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    // Update pagination
    totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
    currentPage = 1; // Reset to first page when filtering
    renderTable();
    updatePagination();
  }

  function renderTable() {
    // Clear table
    issuesTableBody.innerHTML = '';

    if (filteredIssues.length === 0) {
      issuesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 30px;">
            <i class="fas fa-search" style="font-size: 2rem; color: rgba(255,255,255,0.3); margin-bottom: 15px;"></i>
            <p>No issues found matching your criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    // Calculate start and end index
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredIssues.length);

    // Update pagination info
    startRangeSpan.textContent = startIndex + 1;
    endRangeSpan.textContent = endIndex;
    totalItemsSpan.textContent = filteredIssues.length;



    // Create table rows
    const currentPageIssues = filteredIssues.slice(startIndex, endIndex);

    currentPageIssues.forEach(issue => {
      const isOverdueStatus = issue.status === 'issued' && isOverdue(issue);
      const statusDisplay = isOverdueStatus ? 'overdue' : issue.status;

      const authorText = Array.isArray(issue.bookAuthor)
          ? issue.bookAuthor.join(', ')
          : (issue.bookAuthor || 'Unknown');

      const coverUrl = issue.coverUrl || '/api/placeholder/200/300';

      const row = document.createElement('tr');

      row.innerHTML = `
    <td data-label="Book Cover">
      <img src="${coverUrl}" alt="Book cover" class="book-cover" 
           onerror="this.onerror=null; this.src='/api/placeholder/200/300';">
    </td>
    <td data-label="Book Details">
      <div class="book-info">
        <h3 class="book-title">${issue.bookTitle || 'Unknown Title'}</h3>
        <p class="book-author">${authorText}</p>
        <p class="book-isbn">ISBN: ${issue.bookIsbn || 'N/A'}</p>
      </div>
    </td>
    <td data-label="User Details">
      <div class="user-info">
        <p class="user-name">${issue.personal?.fullName || 'N/A'}</p>
        <p class="user-id">${issue.membershipId || 'N/A'}</p>
        <p class="user-email">${issue.personal?.email || 'N/A'}</p>
      </div>
    </td>
    <td data-label="Issue Date">
      ${formatDate(issue.issueDate)}
    </td>
    <td data-label="Return Date">
      ${formatDate(issue.returnDate)}
    </td>
    <td data-label="Status">
      <span class="status-badge ${statusDisplay}">${statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1)}</span>
    </td>
    <td data-label="Actions">
      <div class="action-buttons">
        ${issue.status === 'issued' ?
          `<button class="action-btn return-btn" data-issue-id="${issue.id}" title="Return Book">
            <i class="fas fa-book-reader"></i>
          </button>` : ''
      }
        <button class="action-btn view-btn" data-issue-id="${issue.id}" title="View Details">
          <i class="fas fa-eye"></i>
        </button>
      </div>
    </td>
  `;

      issuesTableBody.appendChild(row);
    });

    // Add event listeners to action buttons
    document.querySelectorAll('.return-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const issueId = e.currentTarget.getAttribute('data-issue-id');
        openReturnModal(issueId);
      });
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const issueId = e.currentTarget.getAttribute('data-issue-id');
        openViewModal(issueId);
      });
    });
  }

  function updatePagination() {
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages || totalPages === 0;

    // Generate page numbers
    pageNumbersContainer.innerHTML = '';

    // Calculate range of pages to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust start page if needed
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    // Add first page if not in range
    if (startPage > 1) {
      addPageNumber(1);
      if (startPage > 2) {
        pageNumbersContainer.appendChild(createEllipsis());
      }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      addPageNumber(i);
    }

    // Add last page if not in range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbersContainer.appendChild(createEllipsis());
      }
      addPageNumber(totalPages);
    }
  }

  function addPageNumber(pageNum) {
    const pageBtn = document.createElement('button');
    pageBtn.classList.add('page-number');
    if (pageNum === currentPage) {
      pageBtn.classList.add('active');
    }
    pageBtn.textContent = pageNum;
    pageBtn.addEventListener('click', () => changePage(pageNum));
    pageNumbersContainer.appendChild(pageBtn);
  }

  function createEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.classList.add('page-ellipsis');
    ellipsis.textContent = '...';
    return ellipsis;
  }

  function changePage(newPage) {
    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    renderTable();
    updatePagination();
  }

  function openReturnModal(issueId) {
    const issue = filteredIssues.find(item => item.id === issueId);
    if (!issue) return;

    // Set current date as default return date
    actualReturnDateInput.value = new Date().toISOString().split('T')[0];

    // Populate modal with issue details
    modalBookCover.src = issue.coverUrl;
    modalBookCover.onerror = function() {
      this.onerror = null;
      this.src = '/api/placeholder/120/180';
    };

    modalBookTitle.textContent = issue.bookTitle || 'Unknown Title';

    const authorText = Array.isArray(issue.bookAuthor)
      ? issue.bookAuthor.join(', ')
      : (issue.bookAuthor || 'Unknown');

    modalBookAuthor.textContent = authorText;
    modalIsbn.textContent = issue.bookIsbn || 'N/A';
    modalUserName.textContent = issue.personal?.fullName || 'N/A';
    modalMembershipId.textContent = issue.membershipId || 'N/A';
    modalIssueDate.textContent = formatDate(issue.issueDate);
    modalReturnDate.textContent = formatDate(issue.returnDate);

    // Store issue ID for reference
    confirmReturnBtn.setAttribute('data-issue-id', issueId);

    // Show modal
    returnModal.style.display = 'block';
  }

  function openViewModal(issueId) {
    const issue = filteredIssues.find(item => item.id === issueId);
    if (!issue) return;

    // Make sure all elements exist before using them
    const viewModalElements = {
      bookCover: document.getElementById('viewModalBookCover'),
      bookTitle: document.getElementById('viewModalBookTitle'),
      bookAuthor: document.getElementById('viewModalBookAuthor'),
      isbn: document.getElementById('viewModalIsbn'),
      userName: document.getElementById('viewModalUserName'),
      membershipId: document.getElementById('viewModalMembershipId'),
      userEmail: document.getElementById('viewModalUserEmail'),
      userPhone: document.getElementById('viewModalUserPhone'),
      issueDate: document.getElementById('viewModalIssueDate'),
      returnDate: document.getElementById('viewModalReturnDate'),
      status: document.getElementById('viewModalStatus'),
      returnDetailsSection: document.getElementById('returnDetailsSection'),
      actualReturnDate: document.getElementById('viewModalActualReturnDate'),
      condition: document.getElementById('viewModalCondition'),
      notes: document.getElementById('viewModalNotes')
    };

    // Check if all elements exist
    for (const [key, element] of Object.entries(viewModalElements)) {
      if (!element) {
        console.error(`Element not found: viewModal${key.charAt(0).toUpperCase() + key.slice(1)}`);
        return; // Exit if any element doesn't exist
      }
    }

    // Populate modal with issue details
    viewModalElements.bookCover.src = issue.coverUrl;
    viewModalElements.bookCover.onerror = function() {
      this.onerror = null;
      this.src = '/api/placeholder/120/180';
    };

    viewModalElements.bookTitle.textContent = issue.bookTitle || 'Unknown Title';

    const authorText = Array.isArray(issue.bookAuthor)
      ? issue.bookAuthor.join(', ')
      : (issue.bookAuthor || 'Unknown');

    viewModalElements.bookAuthor.textContent = authorText;
    viewModalElements.isbn.textContent = `ISBN: ${issue.bookIsbn || 'N/A'}`;
    viewModalElements.userName.textContent = issue.personal?.fullName || 'N/A';
    viewModalElements.membershipId.textContent = issue.membershipId || 'N/A';
    viewModalElements.userEmail.textContent = issue.personal?.email || 'N/A';
    viewModalElements.userPhone.textContent = issue.personal?.phone || 'N/A';
    viewModalElements.issueDate.textContent = formatDate(issue.issueDate);
    viewModalElements.returnDate.textContent = formatDate(issue.returnDate);

    // Set status with appropriate class
    const isOverdueStatus = issue.status === 'issued' && isOverdue(issue);
    const statusDisplay = isOverdueStatus ? 'overdue' : issue.status;
    viewModalElements.status.textContent = statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1);
    viewModalElements.status.className = 'status-badge ' + statusDisplay;

    // Show or hide return details section based on status
    if (issue.status === 'returned') {
      viewModalElements.returnDetailsSection.style.display = 'block';
      viewModalElements.actualReturnDate.textContent = formatDate(issue.actualReturnDate) || 'N/A';
      viewModalElements.condition.textContent = issue.returnCondition || 'N/A';
      viewModalElements.notes.textContent = issue.returnNotes || 'None';
    } else {
      viewModalElements.returnDetailsSection.style.display = 'none';
    }

    // Show modal
    viewModal.style.display = 'block';
  }

  async function processBookReturn() {
    const issueId = confirmReturnBtn.getAttribute('data-issue-id');
    const returnDate = actualReturnDateInput.value;
    const condition = returnConditionSelect.value;
    const notes = returnNotesTextarea.value.trim();

    if (!issueId || !returnDate) {
      showError("Missing required information. Please try again.");
      return;
    }

    try {
      // Update the issue record in Firebase
      const issueRef = doc(db, 'bookIssues', issueId);
      await updateDoc(issueRef, {
        status: 'returned',
        actualReturnDate: returnDate,
        returnCondition: condition,
        returnNotes: notes,
        updatedAt: new Date().toISOString()
      });

      // Update local data
      const issueIndex = allIssues.findIndex(issue => issue.id === issueId);
      if (issueIndex !== -1) {
        allIssues[issueIndex].status = 'returned';
        allIssues[issueIndex].actualReturnDate = returnDate;
        allIssues[issueIndex].returnCondition = condition;
        allIssues[issueIndex].returnNotes = notes;
        allIssues[issueIndex].updatedAt = new Date().toISOString();
      }

      // Refresh filtered issues
      filterIssues();

      // Close return modal and show success
      closeModals();
      showSuccess("Book has been successfully marked as returned.");

    } catch (error) {
      console.error("Error returning book:", error);
      showError("Failed to process book return. Please try again.");
    }
  }

  function exportIssuesToCSV() {
    if (filteredIssues.length === 0) {
      showError("No data to export.");
      return;
    }

    // Create CSV header
    let csvContent = 'Book Title,ISBN,User Name,Membership ID,Issue Date,Return Date,Status\n';

    // Add data rows
    filteredIssues.forEach(issue => {
      const isOverdueStatus = issue.status === 'issued' && isOverdue(issue);
      const statusDisplay = isOverdueStatus ? 'Overdue' : issue.status;

      const row = [
        issue.bookTitle || 'Unknown',
        issue.bookIsbn || 'N/A',
        issue.personal?.fullName || 'N/A',
        issue.membershipId || 'N/A',
        formatDate(issue.issueDate),
        formatDate(issue.returnDate),
        statusDisplay.charAt(0).toUpperCase() + statusDisplay.slice(1)
      ].map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');

      csvContent += row + '\n';
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'book_issues_export.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Helper Functions
  function showLoading() {
    issuesTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="7">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-pulse"></i>
            <span>Loading issues...</span>
          </div>
        </td>
      </tr>
    `;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  function isOverdue(issue) {
    if (issue.status !== 'issued' || !issue.returnDate) return false;

    const returnDate = new Date(issue.returnDate);
    const today = new Date();

    return returnDate < today;
  }

  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate();
  }

  function showSuccess(message) {
    successMessage.textContent = message;
    successModal.style.display = 'block';
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
  }

  function closeModals() {
    // Check if elements exist before trying to hide them
    if (returnModal) returnModal.style.display = 'none';
    if (successModal) successModal.style.display = 'none';
    if (errorModal) errorModal.style.display = 'none';
    if (viewModal) viewModal.style.display = 'none';
  }
});