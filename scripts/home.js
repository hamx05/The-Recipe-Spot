// Flash message function
function showFlashMessage(message, isError = false) {
    const flashMessage = document.getElementById('flash-message');
    flashMessage.textContent = message;
    flashMessage.className = `flash-message rounded-md p-4 mb-6 ${isError ? 'bg-destructive' : 'bg-success'} text-white`;
    flashMessage.classList.remove('hidden');

    // Auto hide after 5 seconds
    setTimeout(() => {
        flashMessage.classList.add('hidden');
    }, 5000);
}

document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem("token");
    const recipeContainer = document.getElementById("recipe-container");
    const loadingState = document.getElementById("loading-state");
    const emptyState = document.getElementById("empty-state");
    const loadMoreContainer = document.getElementById("load-more-container");
    const loadMoreBtn = document.getElementById("load-more-btn");
    const searchInput = document.getElementById("search-input");
    const filterButtons = document.querySelectorAll(".category-pill");
    const profileLink = document.getElementById("profile-link");

    // If user is not logged in, redirect to signin.html
    if (!token) {
        showFlashMessage("Access denied! Please log in first.", true);
        setTimeout(() => {
            window.location.href = "signin.html";
        }, 1500);
        return;
    }

    // Get user info from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;
    const userId = payload.userId;

    // Update username display in the header
    const usernameDisplay = document.getElementById("username-display");
    if (usernameDisplay && username) {
        usernameDisplay.textContent = username;

        // Update profile image with first letter of username
        const profileImage = document.getElementById("profile-image");
        if (profileImage) {
            const firstLetter = username.charAt(0).toUpperCase();
            profileImage.textContent = firstLetter;
        }
    }

    // Set the profile link to point to the user's profile
    if (profileLink && username) {
        profileLink.href = `user-profile.html?username=${username}`;
    }

    // State variables for pagination and filtering
    let currentPage = 1;
    let hasMoreRecipes = true;
    let currentFilter = "all";
    let currentSearch = "";
    let recipesPerPage = 9;
    let allRecipes = []; // Store all loaded recipes for client-side filtering

    // Function to fetch recipes
    async function fetchRecipes(page = 1, filter = "all", search = "") {
        try {
            // Show loading state on first page
            if (page === 1) {
                recipeContainer.innerHTML = "";
                loadingState.classList.remove("hidden");
                emptyState.classList.add("hidden");
                loadMoreContainer.classList.add("hidden");
            }

            // Build query parameters
            let queryParams = `?page=${page}&limit=${recipesPerPage}`;
            if (filter !== "all") {
                queryParams += `&difficulty=${filter}`;
            }
            if (search) {
                queryParams += `&search=${encodeURIComponent(search)}`;
            }

            // Fetch recipes from server
            const response = await fetch(`http://localhost:5000/recipes/all${queryParams}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch recipes");
            }

            const data = await response.json();
            const recipes = data.recipes || [];
            hasMoreRecipes = data.hasMore || false;

            // Store recipes for client-side filtering
            if (page === 1) {
                allRecipes = recipes;
            } else {
                allRecipes = [...allRecipes, ...recipes];
            }

            // Hide loading state
            loadingState.classList.add("hidden");

            // Show empty state if no recipes
            if (recipes.length === 0 && page === 1) {
                emptyState.classList.remove("hidden");
                return;
            }

            // Render recipes
            recipes.forEach(recipe => renderRecipeCard(recipe));

            // Show/hide load more button
            if (hasMoreRecipes) {
                loadMoreContainer.classList.remove("hidden");
            } else {
                loadMoreContainer.classList.add("hidden");
            }

        } catch (error) {
            console.error("Error fetching recipes:", error);
            loadingState.classList.add("hidden");

            // Show error message
            showFlashMessage(`Error loading recipes: ${error.message}`, true);
        }
    }

    // Function to render a recipe card
    function renderRecipeCard(recipe) {
        const template = document.getElementById("recipe-template");
        const recipeCard = document.importNode(template.content, true);

        // Set recipe data
        recipeCard.querySelector(".recipe-image").src = recipe.image || "https://placehold.co/600x400/f8e3c5/f8a27d?text=Recipe";
        recipeCard.querySelector(".recipe-image").alt = recipe.title;
        recipeCard.querySelector(".recipe-title").textContent = recipe.title;
        recipeCard.querySelector(".recipe-description").textContent = recipe.description;
        recipeCard.querySelector(".recipe-author").textContent = `By ${recipe.username}`;
        recipeCard.querySelector(".recipe-author").href = `user-profile.html?username=${recipe.username}`;

        // Set rating
        const rating = recipe.avgRating || 0;
        const ratingCount = recipe.commentsCount || 0;
        recipeCard.querySelector(".star-rating").innerHTML = generateStarRating(rating);
        recipeCard.querySelector(".rating-text").textContent = `${rating.toFixed(1)} (${ratingCount})`;

        // Set cook time if available
        if (recipe.cookTime) {
            recipeCard.querySelector(".cook-time").textContent = `${recipe.cookTime} min`;
        } else {
            const timeElement = recipeCard.querySelector(".cook-time").parentElement;
            if (timeElement) {
                timeElement.classList.add("hidden");
            }
        }

        // Set likes
        recipeCard.querySelector(".like-count").textContent = recipe.likesCount || 0;

        // Set comments count
        const commentCount = recipe.commentsCount || 0;
        recipeCard.querySelector(".comment-count").textContent = commentCount;

        // Set view recipe link
        recipeCard.querySelector(".view-recipe-btn").href = `recipe-detail.html?id=${recipe.id}`;

        // Add recipe ID to like button
        recipeCard.querySelector(".like-button").dataset.id = recipe.id;

        // Check if user has liked this recipe
        if (recipe.userLiked) {
            recipeCard.querySelector(".like-button").classList.add("active");
        }

        // Add to container
        recipeContainer.appendChild(recipeCard);
    }

    // Function to generate star rating HTML
    function generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = '';

        // Add full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += `
                <svg class="star star-filled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            `;
        }

        // Add half star if needed
        if (hasHalfStar) {
            starsHTML += `
                <svg class="star" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <defs>
                        <linearGradient id="half-star-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="50%" stop-color="#FF7D45" />
                            <stop offset="50%" stop-color="#e2d5c3" />
                        </linearGradient>
                    </defs>
                    <path fill="url(#half-star-gradient)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            `;
        }

        // Add empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += `
                <svg class="star star-empty" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            `;
        }

        return starsHTML;
    }

    // Function to filter recipes by search term
    function filterRecipesBySearch(searchTerm) {
        if (!searchTerm) {
            return allRecipes;
        }

        searchTerm = searchTerm.toLowerCase();
        return allRecipes.filter(recipe =>
            recipe.title.toLowerCase().includes(searchTerm)
        );
    }

    // Set up event listeners

    // Load more button
    loadMoreBtn.addEventListener("click", function () {
        currentPage++;
        fetchRecipes(currentPage, currentFilter, currentSearch);
    });

    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener("click", function () {
            const filter = this.getAttribute("data-filter");

            // Update active state
            filterButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            // Reset page and update filter
            currentPage = 1;
            currentFilter = filter;

            // Fetch recipes with new filter
            fetchRecipes(currentPage, currentFilter, currentSearch);
        });
    });

    // Search input
    let searchTimeout;
    searchInput.addEventListener("input", function () {
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            currentSearch = this.value.trim();
            currentPage = 1;

            // If we have recipes loaded and it's just a search filter change,
            // we can filter client-side for better performance
            if (allRecipes.length > 0 && currentFilter === "all") {
                const filteredRecipes = filterRecipesBySearch(currentSearch);

                // Clear container and show filtered results
                recipeContainer.innerHTML = "";

                if (filteredRecipes.length === 0) {
                    emptyState.classList.remove("hidden");
                    loadMoreContainer.classList.add("hidden");
                } else {
                    emptyState.classList.add("hidden");
                    filteredRecipes.forEach(recipe => renderRecipeCard(recipe));
                    loadMoreContainer.classList.add("hidden"); // Hide load more when filtering client-side
                }
            } else {
                // Otherwise fetch from server
                fetchRecipes(currentPage, currentFilter, currentSearch);
            }
        }, 500);
    });

    // Handle Like Button Clicks
    document.addEventListener("click", async function (e) {
        if (e.target.closest(".like-button")) {
            const likeButton = e.target.closest(".like-button");
            const recipeId = likeButton.dataset.id;

            try {
                const response = await fetch(`http://localhost:5000/recipes/${recipeId}/like`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    const likeCount = likeButton.querySelector(".like-count");
                    const currentLikes = parseInt(likeCount.textContent);

                    if (data.message === "Recipe liked successfully.") {
                        likeCount.textContent = currentLikes + 1;
                        likeButton.classList.add("active");
                    } else {
                        likeCount.textContent = currentLikes - 1;
                        likeButton.classList.remove("active");
                    }
                }
            } catch (error) {
                console.error("Error liking recipe:", error);
                showFlashMessage("Error updating like status", true);
            }
        }
    });

    // Initial fetch
    fetchRecipes();
});

// Logout Function
function logout() {
    localStorage.removeItem("token");
    showFlashMessage("Logged out successfully!");
    setTimeout(() => {
        window.location.href = "signin.html";
    }, 1500);
}