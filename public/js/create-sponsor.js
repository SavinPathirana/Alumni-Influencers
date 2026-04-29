(function () {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    //Active sidebar link
    const nav = document.getElementById('nav-create-sponsor');
    if (nav) nav.classList.add('active');

    document.getElementById('createSponsorBtn').addEventListener('click', async () => {
        const errorEl = document.getElementById('sponsorError');
        const successEl = document.getElementById('sponsorSuccess');
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        const sponsor_name = document.getElementById('sponsorName').value.trim();
        const email = document.getElementById('sponsorEmail').value.trim();
        const password = document.getElementById('sponsorPassword').value;

        if (!sponsor_name || !email || !password) {
            errorEl.textContent = 'All fields are required.';
            errorEl.style.display = 'block';
            return;
        }

        try {
            const res = await fetch('/api/auth/create-sponsor', {
                method: 'POST',
                headers,
                body: JSON.stringify({ email, password, sponsor_name })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            successEl.textContent = `${data.message} (Email: ${data.email})`;
            successEl.style.display = 'block';

            document.getElementById('sponsorName').value = '';
            document.getElementById('sponsorEmail').value = '';
            document.getElementById('sponsorPassword').value = '';
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
        }
    });
})();
