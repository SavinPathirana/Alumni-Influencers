document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');

    const showError = (msg) => {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
    };

    const showSuccess = (msg) => {
        successDiv.textContent = msg;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
    };

    //Login form handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('loginBtn');

            btn.disabled = true;
            btn.innerHTML = '<span>Signing in...</span>';

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': localStorage.getItem('apiKey') || ''
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    //Store the JWT token
                    localStorage.setItem('token', data.token);
                    showSuccess('Login successful! Redirecting...');
                    setTimeout(() => window.location.href = '/dashboard', 500);
                } else {
                    showError(data.error || 'Login failed.');
                }
            } catch (err) {
                showError('Network error. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>Sign In</span><i class="bi bi-arrow-right"></i>';
            }
        });
    }

    //Register form handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('registerBtn');

            btn.disabled = true;
            btn.innerHTML = '<span>Creating account...</span>';

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': localStorage.getItem('apiKey') || ''
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    showSuccess(data.message || 'Account created! Check your email to verify.');
                    setTimeout(() => window.location.href = '/verify-email', 2000);
                } else {
                    showError(data.error || 'Registration failed.');
                }
            } catch (err) {
                showError('Network error. Please try again.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span>Create Account</span><i class="bi bi-person-plus"></i>';
            }
        });
    }
});
