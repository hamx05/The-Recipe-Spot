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
    const currentUsername = payload.username;

    // Update username display in the header
    const usernameDisplay = document.getElementById("username-display");
    if (usernameDisplay && currentUsername) {
        usernameDisplay.textContent = currentUsername;

        // Update profile image with first letter of username
        const profileImage = document.getElementById("profile-image");
        if (profileImage) {
            const firstLetter = currentUsername.charAt(0).toUpperCase();
            profileImage.textContent = firstLetter;
        }


    }

    // Get username from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    if (!username) {
        showError("Username parameter is missing.");
        return;
    }

    const profileLink = document.getElementById("profile-link");
    // Set the profile link to point to the user's profile
    if (profileLink && username) {
        profileLink.href = `user-profile.html?username=${username}`;
    }

    // Update profile title
    document.getElementById("profile-title").textContent = `${username}'s Profile`;
    document.getElementById("profile-subtitle").textContent = `Recipes shared by ${username}`;

    // Update profile avatar
    const profileAvatar = document.getElementById("profile-avatar");
    const firstLetter = username.charAt(0).toUpperCase();
    profileAvatar.textContent = firstLetter;

    // Update profile username
    document.getElementById("profile-username").textContent = username;

    try {
        // Fetch user's recipes
        const response = await fetch(`http://localhost:5000/users/${username}/recipes`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch user's recipes");
        }

        const data = await response.json();
        const recipes = data.recipes || [];

        // Hide loading state
        document.getElementById("loading-state").classList.add("hidden");

        // Update recipe count
        document.getElementById("recipe-count").textContent = `${recipes.length} recipes shared`;

        // Show empty state or recipes grid
        if (recipes.length === 0) {
            document.getElementById("empty-state").classList.remove("hidden");
        } else {
            const recipesGrid = document.getElementById("recipes-grid");
            recipesGrid.classList.remove("hidden");

            // Render recipes
            recipes.forEach(recipe => {
                const template = document.getElementById("recipe-template");
                const recipeCard = document.importNode(template.content, true);

                // Set recipe data
                recipeCard.querySelector(".recipe-image").src = recipe.image || "https://placehold.co/600x400/f8e3c5/f8a27d?text=Recipe";
                recipeCard.querySelector(".recipe-image").alt = recipe.title;
                recipeCard.querySelector(".recipe-title").textContent = recipe.title;
                recipeCard.querySelector(".recipe-description").textContent = recipe.description;
                recipeCard.querySelector(".like-count").textContent = recipe.likesCount || 0;
                recipeCard.querySelector(".comment-count").textContent = recipe.commentsCount || 0;

                // Set cook time if available
                if (recipe.cookTime) {
                    recipeCard.querySelector(".cook-time").textContent = `${recipe.cookTime} min`;
                } else {
                    recipeCard.querySelector(".cook-time").parentElement.classList.add("hidden");
                }

                // Set rating
                const rating = recipe.avgRating || 0;
                const ratingCount = recipe.commentsCount || 0;
                recipeCard.querySelector(".star-rating").innerHTML = generateStarRating(rating);
                recipeCard.querySelector(".rating-text").textContent = `${rating.toFixed(1)} (${ratingCount})`;

                // Set view recipe link
                recipeCard.querySelector(".view-recipe-btn").href = `recipe-detail.html?id=${recipe.id}`;

                recipesGrid.appendChild(recipeCard);
            });
        }

    } catch (error) {
        console.error("Error fetching user profile:", error);
        showError(error.message);
    }
});

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

// Logout Function
function logout() {
    localStorage.removeItem("token");
    showFlashMessage("Logged out successfully!");
    setTimeout(() => {
        window.location.href = "signin.html";
    }, 1500);
}