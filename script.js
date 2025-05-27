// Animation for the hero section images and navigation functionality
import { auth } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('script.js: DOM fully loaded');

    // Slight hover effect for article cards
    const articleCards = document.querySelectorAll('.article-card');
    articleCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Like button functionality
    const likeButtons = document.querySelectorAll('.like-button');
    likeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                this.style.color = '#ff4d4d';
            } else {
                this.style.color = '#fff';
            }
        });
    });

    // Close menus when clicking on a link in mobile menu
    const mobileLinks = document.querySelectorAll('.mobile-menu a');
    if (mobileLinks) {
        mobileLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Don't interfere with links that have their own click handlers
                if (this.getAttribute('href') === '#signout') {
                    return;
                }

                const mobileMenu = document.querySelector('.mobile-menu');
                const menuToggle = document.querySelector('.menu-toggle');

                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    if (menuToggle) {
                        menuToggle.classList.remove('fa-times');
                        menuToggle.classList.add('fa-bars');
                    }
                }
            });
        });
    }

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            // Don't interfere with special links like #signout
            if (this.getAttribute('href') === '#signout') {
                return;
            }

            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add reveal animations on scroll
    const revealElements = document.querySelectorAll('.discover-content, .article-card, .collection-item');

    const revealOnScroll = function() {
        for (let i = 0; i < revealElements.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = revealElements[i].getBoundingClientRect().top;
            const elementVisible = 150;

            if (elementTop < windowHeight - elementVisible) {
                revealElements[i].classList.add('active');
            }
        }
    };

    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Check on load
});

// Show notification - keeping this function for backward compatibility
function showNotification(message, isError = false) {
    // Check if notification container exists, if not, create it
    let notificationContainer = document.getElementById('notificationContainer');

    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification glass-effect';
    notification.style.padding = '12px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.backgroundColor = isError ? 'rgba(255, 50, 50, 0.2)' : 'rgba(0, 255, 255, 0.2)';
    notification.style.color = isError ? '#ff5050' : '#0ff';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    notification.style.transition = 'all 0.3s ease';
    notification.style.border = `1px solid ${isError ? 'rgba(255, 50, 50, 0.5)' : 'rgba(0, 255, 255, 0.5)'}`;

    notification.innerHTML = `
        <div style="display: flex; align-items: center;">
            <i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}" style="margin-right: 10px;"></i>
            <span>${message}</span>
        </div>
    `;

    // Add notification to container
    notificationContainer.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';

        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    }, 5000);
}