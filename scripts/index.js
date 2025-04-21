document.addEventListener('DOMContentLoaded', function () {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slide-dot');
    const prevArrow = document.querySelector('.slide-arrow.prev');
    const nextArrow = document.querySelector('.slide-arrow.next');
    const progressBar = document.querySelector('.slideshow-progress');
    const totalSlides = slides.length;
    const slideDuration = 5000; // 5 seconds per slide
    const flashMessage = document.getElementById('flash-message');


    let slideInterval;
    let progressInterval;
    let progressWidth = 0;

    // Check if user is already logged in
    if (localStorage.getItem('token')) {
        // Show flash message before redirecting
        showFlashMessage('You are already logged in. Redirecting to Home Page...', false);

        // Set a short delay before redirecting to allow the user to see the message
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000); // 1.5 second delay
    }

    // Function to start progress bar animation
    function startProgressBar() {
        // Reset progress bar
        progressWidth = 0;
        progressBar.style.width = '0%';

        // Clear any existing interval
        clearInterval(progressInterval);

        // Start new progress interval
        progressInterval = setInterval(() => {
            progressWidth += 0.1;
            progressBar.style.width = `${(progressWidth / slideDuration) * 100}%`;

            if (progressWidth >= slideDuration) {
                clearInterval(progressInterval);
            }
        }, 10);
    }

    // Show a specific slide
    function showSlide(index) {
        // Reset interval when manually changing slides
        clearInterval(slideInterval);

        // Hide all slides
        slides.forEach(slide => {
            slide.classList.remove('active');
        });

        // Deactivate all dots
        dots.forEach(dot => {
            dot.classList.remove('active');
        });

        // Show the selected slide and activate corresponding dot
        slides[index].classList.add('active');
        dots[index].classList.add('active');

        // Update current slide index
        currentSlide = index;

        // Start progress bar
        startProgressBar();

        // Restart slideshow interval
        slideInterval = setInterval(nextSlide, slideDuration);
    }

    // Next slide function
    function nextSlide() {
        let next = currentSlide + 1;
        if (next >= totalSlides) next = 0;
        showSlide(next);
    }

    // Previous slide function
    function prevSlide() {
        let prev = currentSlide - 1;
        if (prev < 0) prev = totalSlides - 1;
        showSlide(prev);
    }

    // Add event listeners to dots
    dots.forEach(dot => {
        dot.addEventListener('click', function () {
            const slideIndex = parseInt(this.getAttribute('data-index'));
            showSlide(slideIndex);
        });
    });

    // Add event listeners to arrows
    prevArrow.addEventListener('click', prevSlide);
    nextArrow.addEventListener('click', nextSlide);

    // Pause slideshow when hovering over it
    const slideshowContainer = document.querySelector('.slideshow-container');
    slideshowContainer.addEventListener('mouseenter', function () {
        clearInterval(slideInterval);
        clearInterval(progressInterval);
    });

    slideshowContainer.addEventListener('mouseleave', function () {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, slideDuration);
        startProgressBar();
    });

    // Initialize slideshow
    startProgressBar();
    slideInterval = setInterval(nextSlide, slideDuration);

    // Display flash message
    function showFlashMessage(message, isError = false) {
        flashMessage.textContent = message;
        flashMessage.className = `flash-message rounded-md p-4 mb-4 ${isError ? 'bg-destructive' : 'bg-success'} text-white`;
        flashMessage.classList.remove('hidden');
    }

    // Add keyboard navigation
    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
        }
    });
});