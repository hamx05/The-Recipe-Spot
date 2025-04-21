// Logout function
function logout() {
    localStorage.removeItem('token');
    showFlashMessage('Logged out successfully!', false);
    setTimeout(() => {
        window.location.href = 'signin.html';
    }, 1500);
}

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
    console.log('DOM loaded, initializing recipe form...');

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        showFlashMessage('Please log in to create a recipe', true);
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

        console.log('User authenticated:', username);

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
    } catch (error) {
        console.error('Error parsing token:', error);
        showFlashMessage('Authentication error. Please sign in again.', true);
        localStorage.removeItem('token');
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 1500);
        return;
    }

    // Image preview functionality
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('image-preview');
    const uploadText = document.getElementById('upload-text');

    imageInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.style.backgroundImage = `url(${e.target.result})`;
                imagePreview.classList.add('has-image');
                uploadText.style.display = 'none';
            }
            reader.readAsDataURL(file);
        }
    });

    // Ingredients functionality
    const ingredientsContainer = document.getElementById('ingredients-container');
    const newIngredientInput = document.getElementById('new-ingredient');
    const addIngredientButton = document.getElementById('add-ingredient');

    let ingredientCount = 0;

    // Add ingredient when button is clicked
    addIngredientButton.addEventListener('click', function () {
        console.log('Add ingredient button clicked');
        const ingredientText = newIngredientInput.value.trim();
        if (ingredientText) {
            addIngredient(ingredientText);
            newIngredientInput.value = '';
            newIngredientInput.focus();
        }
    });

    // Add ingredient when Enter is pressed in the input field
    newIngredientInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            addIngredientButton.click(); // Trigger the add button
        }
    });

    function addIngredient(text) {
        console.log('Adding ingredient:', text);
        const ingredientItem = document.createElement('div');
        ingredientItem.className = 'ingredient-item';
        ingredientItem.innerHTML = `
            <span>${text}</span>
            <input type="hidden" name="ingredients[]" value="${text}">
            <button type="button" class="remove-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        ingredientsContainer.appendChild(ingredientItem);
        ingredientCount++;

        // Add event listener to remove button
        const removeButton = ingredientItem.querySelector('.remove-btn');
        removeButton.addEventListener('click', function () {
            ingredientItem.remove();
            ingredientCount--;
        });
    }

    // Method steps functionality
    const stepsContainer = document.getElementById('steps-container');
    const newStepInput = document.getElementById('new-step');
    const addStepButton = document.getElementById('add-step');

    let stepCount = 0;

    // Add step when button is clicked
    addStepButton.addEventListener('click', function () {
        console.log('Add step button clicked');
        const stepText = newStepInput.value.trim();
        if (stepText) {
            addStep(stepText);
            newStepInput.value = '';
            newStepInput.focus();
        }
    });

    // Add step when Enter is pressed in the textarea
    newStepInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline in textarea
            addStepButton.click(); // Trigger the add button
        }
    });

    function addStep(text) {
        console.log('Adding step:', text);
        stepCount++;
        const stepItem = document.createElement('div');
        stepItem.className = 'step-item';
        stepItem.innerHTML = `
            <div class="flex-1">
                <div class="font-medium text-primary">Step ${stepCount}</div>
                <p class="mt-1">${text}</p>
                <input type="hidden" name="steps[]" value="${text}">
            </div>
            <button type="button" class="remove-btn ml-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        stepsContainer.appendChild(stepItem);

        // Add event listener to remove button
        const removeButton = stepItem.querySelector('.remove-btn');
        removeButton.addEventListener('click', function () {
            stepItem.remove();
            // Renumber steps
            renumberSteps();
        });
    }

    function renumberSteps() {
        const steps = stepsContainer.querySelectorAll('.step-item');
        stepCount = 0;
        steps.forEach(step => {
            stepCount++;
            step.querySelector('.font-medium').textContent = `Step ${stepCount}`;
        });
    }

    // Form submission
    const recipeForm = document.getElementById('recipe-form');
    const submitButton = document.getElementById('submit-button');

    recipeForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Prevent default form submission
        console.log('Form submitted, preparing to send data...');

        // Validate form
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();

        if (!title) {
            showFlashMessage('Please enter a recipe title', true);
            return;
        }

        if (!description) {
            showFlashMessage('Please enter a recipe description', true);
            return;
        }

        if (ingredientCount === 0) {
            showFlashMessage('Please add at least one ingredient', true);
            return;
        }

        if (stepCount === 0) {
            showFlashMessage('Please add at least one step', true);
            return;
        }

        // Remove this validation check

        // Get ingredients
        const ingredientInputs = document.querySelectorAll('input[name="ingredients[]"]');
        const ingredients = Array.from(ingredientInputs).map(input => input.value);

        // Get method steps
        const stepInputs = document.querySelectorAll('input[name="steps[]"]');
        const method = Array.from(stepInputs).map(input => input.value);

        // Get image (if any)
        let imageUrl = '';
        if (imagePreview.classList.contains('has-image')) {
            imageUrl = imagePreview.style.backgroundImage.slice(5, -2); // Remove url(" and ")
        } else {
            imageUrl = `https://placehold.co/600x400/f8e3c5/FF7D45?text=${encodeURIComponent(title)}`;
        }

        // Get other form values
        const prepTime = parseInt(document.getElementById('prep-time').value) || 0;
        const cookTime = parseInt(document.getElementById('cook-time').value) || 0;
        const servings = parseInt(document.getElementById('servings').value) || 0;
        const calories = parseInt(document.getElementById('calories').value) || 0;
        const difficulty = document.getElementById('difficulty').value;

        // Create recipe object
        const recipeData = {
            title,
            description,
            image: imageUrl,
            prepTime,
            cookTime,
            servings,
            calories,
            difficulty,
            ingredients,
            method
        };

        console.log('Recipe data prepared:', recipeData);

        try {
            // Show loading state
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
            `;

            console.log('Sending POST request to server...');

            // Submit recipe to server
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(recipeData)
            });

            console.log('Server response received:', response.status);

            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create recipe');
            }

            const data = await response.json();
            console.log('Recipe created successfully:', data);

            showFlashMessage('Recipe published successfully!', false);
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);

        } catch (error) {
            console.error('Error creating recipe:', error);
            showFlashMessage(`Error creating recipe: ${error.message}`, true);
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});