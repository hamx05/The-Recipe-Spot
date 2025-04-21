document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const form = document.getElementById('signup-form');
    const [username, password, confirmPassword, firstName, lastName] = [
        'username', 'password', 'confirmPassword', 'firstName', 'lastName'
    ].map(id => document.getElementById(id));

    const submitButton = document.getElementById('submit-button');
    const flashMessage = document.getElementById('flash-message');
    const strengthMeterFill = document.getElementById('strength-meter-fill');

    // Password Strength Check
    function checkPasswordStrength(pw) {
        let strength = 0;
        if (pw.length >= 8) strength++;
        if (/[a-z]/.test(pw)) strength++;
        if (/[A-Z]/.test(pw)) strength++;
        if (/[0-9]/.test(pw)) strength++;
        return strength;
    }

    // Update Strength Meter
    password.addEventListener('input', () => {
        const strength = checkPasswordStrength(password.value);
        strengthMeterFill.style.width = strength === 4 ? '100%' :
            strength === 3 ? '75%' :
                strength >= 2 ? '50%' :
                    strength === 1 ? '25%' : '0%';
        strengthMeterFill.className = `strength-meter-fill ${strength === 4 ? 'bg-strong' :
            strength === 3 ? 'bg-medium' :
                strength === 2 ? 'bg-medium' : 'bg-weak'
            }`;
    });

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;

        try {
            // Basic Validation
            if (!firstName.value.trim() || !lastName.value.trim() ||
                !username.value.trim() || !password.value.trim()) {
                throw new Error('Please fill all fields correctly');
            }

            if (password.value !== confirmPassword.value) {
                throw new Error('Password don\'t match.');
            }

            // Make Request
            const response = await fetch('http://localhost:5000/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.value,
                    password: password.value,
                    firstName: firstName.value,
                    lastName: lastName.value
                })
            });

            // Handle Response
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Signup failed');

            // Success
            flashMessage.textContent = 'Account created successfully!';
            flashMessage.className = 'flash-message bg-success text-white';
            setTimeout(() => window.location.href = 'signin.html', 2000);

        } catch (error) {
            flashMessage.textContent = error.message;
            flashMessage.className = 'flash-message bg-destructive text-white';
            console.error('Signup Error:', error);
        } finally {
            submitButton.disabled = false;
        }
    });

    // Password Toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = document.getElementById(toggle.dataset.target);
            const [eyeOpen, eyeClosed] = ['eye-open', 'eye-closed']
                .map(cls => toggle.querySelector(`.${cls}`));

            input.type = input.type === 'password' ? 'text' : 'password';
            eyeOpen.classList.toggle('hidden');
            eyeClosed.classList.toggle('hidden');
        });
    });
});