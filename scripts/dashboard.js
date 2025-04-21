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

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        showFlashMessage('Access denied! Please log in first.', true);
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 1500);
        return;
    }

    try {
        // Get user info from token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = payload.username;
        const userId = payload.userId;
        const profileLink = document.getElementById("profile-link");

        // Update username in header
        const usernameElement = document.getElementById('username-display');
        if (usernameElement) {
            usernameElement.textContent = username;

            // Update profile image with first letter of username
            const profileImage = document.getElementById('profile-image');
            if (profileImage) {
                const firstLetter = username.charAt(0).toUpperCase();
                profileImage.textContent = firstLetter;
            }

            // Set the profile link to point to the user's profile
            if (profileLink && username) {
                profileLink.href = `user-profile.html?username=${username}`;
            }
        }

        // Fetch user's recipes
        fetchUserRecipes();

        // Set up tab functionality
        setupTabs();

        // Set up delete modal
        setupDeleteModal();

    } catch (error) {
        console.error('Error parsing token:', error);
        showFlashMessage('Authentication error. Please sign in again.', true);
        localStorage.removeItem('token');
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 1500);
    }
});

// Replace the fetchUserRecipes function with this updated version that includes better sorting for the Popular tab
async function fetchUserRecipes() {
    const token = localStorage.getItem('token');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const emptyState = document.getElementById('empty-state');

    // Show loading state
    loadingState.classList.remove('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        console.log('Fetching user recipes...');

        // Use the correct endpoint from your server.js
        const response = await fetch('http://localhost:5000/recipes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch recipes: ${response.status} ${response.statusText}`);
        }

        const recipes = await response.json();
        console.log('Recipes data:', recipes);

        // Hide loading state
        loadingState.classList.add('hidden');

        // Update dashboard stats
        updateDashboardStats(recipes);

        // Show empty state or recipes
        if (!recipes || recipes.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            // Sort recipes by date (newest first) for All Recipes tab
            const sortedByDate = [...recipes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            populateRecipeGrid('all-recipes-grid', sortedByDate);

            // Sort recipes by popularity (sum of likes and comments) for Popular tab
            const popularRecipes = [...recipes].sort((a, b) => {
                const aPopularity = (a.likesCount || 0) + (a.commentsCount || 0);
                const bPopularity = (b.likesCount || 0) + (b.commentsCount || 0);
                return bPopularity - aPopularity; // Descending order
            });
            populateRecipeGrid('popular-recipes-grid', popularRecipes);
        }

    } catch (error) {
        console.error('Error fetching recipes:', error);
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        document.getElementById('error-message').textContent = error.message;
        showFlashMessage(`Error loading recipes: ${error.message}`, true);
    }
}

// Replace the updateDashboardStats function with this improved version
function updateDashboardStats(recipes) {
    console.log('Updating dashboard stats with recipes:', recipes);

    // Update total recipes
    const totalRecipes = recipes.length;
    document.getElementById('total-recipes').textContent = totalRecipes;

    // Calculate total likes
    let totalLikes = 0;
    recipes.forEach(recipe => {
        const likes = parseInt(recipe.likesCount) || 0;
        totalLikes += likes;
    });
    document.getElementById('total-likes').textContent = totalLikes;

    // Calculate total comments
    let totalComments = 0;
    recipes.forEach(recipe => {
        const comments = parseInt(recipe.commentsCount) || 0;
        totalComments += comments;
    });
    document.getElementById('total-comments').textContent = totalComments;

    console.log('Stats updated:', { totalRecipes, totalLikes, totalComments });
}

function populateRecipeGrid(gridId, recipes) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';

    console.log(`Populating ${gridId} with ${recipes.length} recipes`);

    if (recipes.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'col-span-full text-center py-8 text-textMuted';
        emptyMessage.innerHTML = 'No recipes to display';
        grid.appendChild(emptyMessage);
        return;
    }

    recipes.forEach(recipe => {
        console.log('Processing recipe:', recipe);
        const template = document.getElementById('recipe-template');
        const recipeCard = document.importNode(template.content, true);

        // Set recipe data
        recipeCard.querySelector('.recipe-image').src = recipe.image || "https://placehold.co/600x400/f8e3c5/FF7D45?text=Recipe";
        recipeCard.querySelector('.recipe-image').alt = recipe.title;
        recipeCard.querySelector('.recipe-title').textContent = recipe.title;
        recipeCard.querySelector('.recipe-description').textContent = recipe.description;
        recipeCard.querySelector('.like-count').textContent = recipe.likesCount || 0;
        recipeCard.querySelector('.comment-count').textContent = recipe.commentsCount || 0;

        // Set cook time if available
        if (recipe.cookTime) {
            recipeCard.querySelector('.cook-time').textContent = `${recipe.cookTime} mins`;
        }

        // Set servings if available
        if (recipe.servings) {
            recipeCard.querySelector('.servings').textContent = `${recipe.servings} servings`;
        }

        // Set up links
        recipeCard.querySelector('.view-recipe-btn').href = `recipe-detail.html?id=${recipe.id}`;

        // Set up delete button
        const deleteButton = recipeCard.querySelector('.delete-recipe-btn');
        deleteButton.addEventListener('click', function () {
            showDeleteModal(recipe.id, recipe.title);
        });

        grid.appendChild(recipeCard);
    });
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Show corresponding tab content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');
        });
    });
}

function setupDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const cancelButton = document.getElementById('cancel-delete');

    cancelButton.addEventListener('click', function () {
        modal.classList.remove('active');
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function showDeleteModal(recipeId, recipeTitle) {
    const modal = document.getElementById('delete-modal');
    const confirmButton = document.getElementById('confirm-delete');

    // Update modal title if needed
    modal.querySelector('h2').textContent = `Delete Recipe: ${recipeTitle}`;

    // Show modal
    modal.classList.add('active');

    // Set up confirm button
    confirmButton.onclick = async function () {
        await deleteRecipe(recipeId);
        modal.classList.remove('active');
    };
}

// Replace the deleteRecipe function with this updated version that includes better error handling
async function deleteRecipe(recipeId) {
    const token = localStorage.getItem('token');

    try {
        console.log(`Attempting to delete recipe with ID: ${recipeId}`);

        // Show a loading indicator or disable the button here if needed

        const response = await fetch(`http://localhost:5000/recipes/${recipeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Delete response status:', response.status);

        if (!response.ok) {
            // Try to get more detailed error information
            let errorMessage = `Failed to delete recipe (Status: ${response.status})`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // If we can't parse the error response, just use the status text
                errorMessage = `Failed to delete recipe: ${response.statusText}`;
            }

            throw new Error(errorMessage);
        }

        // Success - refresh the recipes list
        console.log('Recipe deleted successfully');
        showFlashMessage('Recipe deleted successfully');
        fetchUserRecipes();

    } catch (error) {
        console.error('Error deleting recipe:', error);

        // Check if the server endpoint doesn't exist (404)
        if (error.message.includes('404')) {
            showFlashMessage('Delete functionality is not available on the server. Please implement the DELETE endpoint in your server.js file.', true);
        } else {
            showFlashMessage(`Failed to delete recipe: ${error.message}`, true);
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    showFlashMessage('Logged out successfully!');
    setTimeout(() => {
        window.location.href = 'signin.html';
    }, 1500);
}