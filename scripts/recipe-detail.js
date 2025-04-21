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

    // If user is not logged in, redirect to signin.html
    if (!token) {
        showFlashMessage('Access denied! Please log in first.', true);
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 1500);
        return;
    }

    // Get user info from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    const username = payload.username;
    const profileLink = document.getElementById("profile-link");

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

        // Set the profile link to point to the user's profile
        if (profileLink && username) {
            profileLink.href = `user-profile.html?username=${username}`;
        }
    }

    // Get recipe ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');

    if (!recipeId) {
        showError("Recipe ID is missing. Please go back and try again.");
        return;
    }

    try {
        // Fetch recipe details
        const response = await fetch(`http://localhost:5000/recipes/${recipeId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load recipe details.");
        }

        const recipe = await response.json();

        // Hide loading state and show recipe content
        document.getElementById("loading-state").classList.add("hidden");
        document.getElementById("recipe-content").classList.remove("hidden");

        // Populate recipe details
        populateRecipeDetails(recipe);

        // Set up tab functionality
        setupTabs();

        // Set up like button
        setupLikeButton(recipe);

        // Set up comment form
        setupCommentForm(recipe);

    } catch (error) {
        console.error("Error loading recipe:", error);
        showError(error.message);
    }
});

function populateRecipeDetails(recipe) {
    // Set basic recipe info
    document.getElementById("recipe-title").textContent = recipe.title;
    document.getElementById("recipe-description").textContent = recipe.description;
    document.getElementById("recipe-author").textContent = recipe.username;
    document.getElementById("recipe-author").href = `user-profile.html?username=${recipe.username}`;
    document.getElementById("recipe-image").src = recipe.image || "https://placehold.co/800x600/f8e3c5/f8a27d?text=Recipe";
    document.getElementById("recipe-image").alt = recipe.title;

    // Set recipe metadata
    document.getElementById("prep-time").textContent = `${recipe.prepTime || 0} mins`;
    document.getElementById("cook-time").textContent = `${recipe.cookTime || 0} mins`;
    document.getElementById("servings").textContent = recipe.servings || 0;
    document.getElementById("difficulty").textContent = recipe.difficulty || "Medium";

    // Set likes count
    document.getElementById("likes-count").textContent = recipe.likesCount || 0;

    // Set star rating
    const ratingContainer = document.getElementById("recipe-rating");
    ratingContainer.innerHTML = generateStarRating(recipe.avgRating || 0);
    ratingContainer.innerHTML += `<span class="ml-2 text-sm text-textMuted">${recipe.avgRating ? recipe.avgRating.toFixed(1) : "0.0"} (${recipe.commentsCount || 0})</span>`;

    // Populate ingredients
    const ingredientsList = document.getElementById("ingredients-list");
    ingredientsList.innerHTML = "";

    recipe.ingredients.forEach(ingredient => {
        const li = document.createElement("li");
        li.className = "ingredient-item";
        li.innerHTML = `
            <div class="ingredient-dot"></div>
            <span>${ingredient}</span>
        `;
        ingredientsList.appendChild(li);
    });

    // Populate method steps
    const methodList = document.getElementById("method-list");
    methodList.innerHTML = "";

    recipe.method.forEach((step, index) => {
        const div = document.createElement("div");
        div.className = "method-step";
        div.innerHTML = `
            <div class="step-number">${index + 1}</div>
            <p class="leading-relaxed">${step}</p>
        `;
        methodList.appendChild(div);
    });

    // Populate comments
    const commentsContainer = document.getElementById("comments-container");
    commentsContainer.innerHTML = "";
    document.getElementById("comments-count").textContent = recipe.comments ? recipe.comments.length : 0;

    if (recipe.comments && recipe.comments.length > 0) {
        recipe.comments.forEach(comment => {
            const commentDiv = document.createElement("div");
            commentDiv.className = "comment";
            commentDiv.innerHTML = `
                <div class="flex justify-between mb-1">
                    <a href="user-profile.html?username=${comment.username}" class="font-medium text-textPrimary hover:text-primary">${comment.username}</a>
                    <span class="text-xs text-textMuted">${formatDate(comment.createdAt)}</span>
                </div>
                <p class="text-textMuted">${comment.text}</p>
            `;
            commentsContainer.appendChild(commentDiv);
        });
    } else {
        commentsContainer.innerHTML = `
            <div class="text-center py-6 text-textMuted">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p class="mt-2">No comments yet. Be the first to comment!</p>
            </div>
        `;
    }

    // Show nutrition card if calories are available
    if (recipe.calories && recipe.calories > 0) {
        document.getElementById("nutrition-card").classList.remove("hidden");
        document.getElementById("calories").textContent = `${recipe.calories} kcal`;
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            // Remove active class from all buttons and contents
            document.querySelectorAll(".tab-button").forEach(btn => btn.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));

            // Add active class to clicked button
            this.classList.add("active");

            // Show corresponding content
            const tabName = this.getAttribute("data-tab");
            document.getElementById(`${tabName}-tab`).classList.add("active");
        });
    });
}

function setupLikeButton(recipe) {
    const likeButton = document.getElementById("like-button");

    // Check if user has already liked this recipe (this would require a backend endpoint)
    // For now, we'll just toggle the like state on click

    likeButton.addEventListener("click", async function () {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`http://localhost:5000/recipes/${recipe.id}/like`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to like recipe");
            }

            const data = await response.json();

            // Toggle like button appearance
            if (this.classList.contains("btn-primary")) {
                this.classList.remove("btn-primary");
                this.classList.add("btn-outline");
                document.getElementById("likes-count").textContent = parseInt(document.getElementById("likes-count").textContent) - 1;
            } else {
                this.classList.remove("btn-outline");
                this.classList.add("btn-primary");
                document.getElementById("likes-count").textContent = parseInt(document.getElementById("likes-count").textContent) + 1;
            }

        } catch (error) {
            console.error("Error liking recipe:", error);
            showFlashMessage("Failed to like recipe. Please try again.");
        }
    });
}

function setupCommentForm(recipe) {
    const commentForm = document.getElementById("comment-form");
    const commentText = document.getElementById("comment-text");

    commentForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const text = commentText.value.trim();
        if (!text) return;

        try {
            const token = localStorage.getItem("token");
            const payload = JSON.parse(atob(token.split('.')[1]));
            const username = payload.username;

            // Disable form during submission
            const submitButton = this.querySelector("button[type='submit']");
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = "Posting...";

            const response = await fetch(`http://localhost:5000/recipes/${recipe.id}/comment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error("Failed to post comment");
            }

            const data = await response.json();

            // Add new comment to UI
            const commentsContainer = document.getElementById("comments-container");

            // Remove "no comments" message if it exists
            if (commentsContainer.querySelector(".text-center")) {
                commentsContainer.innerHTML = "";
            }

            const commentDiv = document.createElement("div");
            commentDiv.className = "comment";
            commentDiv.innerHTML = `
                <div class="flex justify-between mb-1">
                    <a href="user-profile.html?username=${username}" class="font-medium text-textPrimary hover:text-primary">${username}</a>
                    <span class="text-xs text-textMuted">Just now</span>
                </div>
                <p class="text-textMuted">${text}</p>
            `;
            commentsContainer.prepend(commentDiv);

            // Update comment count
            const commentsCount = document.getElementById("comments-count");
            commentsCount.textContent = parseInt(commentsCount.textContent) + 1;

            // Clear comment input
            commentText.value = "";

            // Re-enable form
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;

        } catch (error) {
            console.error("Error posting comment:", error);
            showFlashMessage("Failed to post comment. Please try again.");

            // Re-enable form
            const submitButton = this.querySelector("button[type='submit']");
            submitButton.disabled = false;
            submitButton.textContent = "Post Comment";
        }
    });
}

function showError(message) {
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("error-state").classList.remove("hidden");
    document.getElementById("error-message").textContent = message;
}

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

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return "Today";
    } else if (diffDays === 1) {
        return "Yesterday";
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Logout Function
function logout() {
    localStorage.removeItem("token");
    showFlashMessage("Logged out successfully!");
    setTimeout(() => {
        window.location.href = "signin.html";
    }, 1500);
}