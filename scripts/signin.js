document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('signin-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const usernameError = document.getElementById('username-error');
  const passwordError = document.getElementById('password-error');
  const passwordToggle = document.querySelector('.password-toggle');
  const eyeOpen = document.querySelector('.eye-open');
  const eyeClosed = document.querySelector('.eye-closed');
  const flashMessage = document.getElementById('flash-message');
  const submitButton = document.getElementById('submit-button');

  // Check if user is already logged in
  if (localStorage.getItem('token')) {
    // Show flash message before redirecting
    showFlashMessage('You are already logged in. Redirecting to Home Page...', false);

    // Set a short delay before redirecting to allow the user to see the message
    setTimeout(() => {
      window.location.href = 'home.html';
    }, 2000); // 2 second delay
  }

  function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
    element.previousElementSibling.querySelector('input').classList.add('error');
  }

  function hideError(element) {
    element.classList.add('hidden');
    element.previousElementSibling.querySelector('input').classList.remove('error');
  }

  // Display flash message
  function showFlashMessage(message, isError = false) {
    flashMessage.textContent = message;
    flashMessage.className = `flash-message rounded-md p-4 mb-4 ${isError ? 'bg-destructive' : 'bg-success'} text-white`;
    flashMessage.classList.remove('hidden');
  }

  // Toggle password visibility
  passwordToggle.addEventListener('click', function () {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeOpen.classList.add('hidden');
      eyeClosed.classList.remove('hidden');
    } else {
      passwordInput.type = 'password';
      eyeOpen.classList.remove('hidden');
      eyeClosed.classList.add('hidden');
    }
  });

  usernameInput.addEventListener('input', function () {
    if (this.value.trim() === '') {
      showError(usernameError, 'Username is required');
    } else {
      hideError(usernameError);
    }
  });

  passwordInput.addEventListener('input', function () {
    if (this.value.trim() === '') {
      showError(passwordError, 'Password is required');
    } else {
      hideError(passwordError);
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    hideError(usernameError);
    hideError(passwordError);
    flashMessage.classList.add('hidden');

    let hasError = false;

    if (usernameInput.value.trim() === '') {
      showError(usernameError, 'Username is required');
      hasError = true;
    }

    if (passwordInput.value.trim() === '') {
      showError(passwordError, 'Password is required');
      hasError = true;
    }

    if (hasError) return;

    // Disable submit button during request
    submitButton.disabled = true;
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Signing in...
      `;

    try {
      console.log('Attempting to sign in...');
      const response = await fetch('http://localhost:5000/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.value,
          password: passwordInput.value
        })
      });

      console.log('Response received:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      // Always reset button state
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;

      if (!response.ok) {
        showFlashMessage(data.error || 'Invalid username or password', true);
        return;
      }

      // Check if token exists in the response
      if (!data.token) {
        showFlashMessage('No authentication token received from server', true);
        return;
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token);
      console.log('Token stored in localStorage');

      // Show success message
      showFlashMessage('Sign in successful!');

      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = 'home.html';
      }, 1500);

    } catch (error) {
      console.error('Error during sign in:', error);

      // Always reset button state on error
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;

      showFlashMessage('An error occurred during sign in. Please try again.', true);
    }
  });
});