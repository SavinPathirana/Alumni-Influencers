/**
 * API Keys Page JS — Admin-only key management
 */
(function () {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    //Active sidebar link
    const nav = document.getElementById('nav-apikeys');
    if (nav) nav.classList.add('active');

    //Load existing keys
    async function loadKeys() {
        try {
            const res = await fetch('/api/keys', { headers });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            const keys = data.api_keys || [];
            const container = document.getElementById('keysList');

            if (keys.length === 0) {
                container.innerHTML = `
                    <div class="content-section" style="text-align:center;padding:40px;">
                        <i class="bi bi-key" style="font-size:48px;color:var(--text-tertiary);"></i>
                        <p style="color:var(--text-secondary);margin-top:12px;">No API keys generated yet.</p>
                    </div>`;
                return;
            }

            container.innerHTML = keys.map(key => {
                const isActive = key.is_active;
                const statusColor = isActive ? 'var(--success)' : 'var(--error)';
                const statusText = isActive ? 'ACTIVE' : 'REVOKED';

                return `
                    <div class="content-section" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <code style="font-size:14px;color:var(--text-primary);">${key.key_preview}</code>
                                <span style="background:${statusColor};color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600;">${statusText}</span>
                            </div>
                            <div style="color:var(--text-secondary);font-size:13px;margin-top:4px;">
                                ${key.client_name} · Created ${new Date(key.created_at).toLocaleDateString()}
                                ${key.revoked_at ? ` · Revoked ${new Date(key.revoked_at).toLocaleDateString()}` : ''}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-stats-key" data-key-id="${key.id}" style="font-size:13px;padding:6px 14px;background:var(--bg-hover);">
                                <i class="bi bi-bar-chart"></i> Stats
                            </button>
                            ${isActive ? `
                                <button class="btn btn-revoke-key" data-key-id="${key.id}" style="font-size:13px;padding:6px 14px;background:var(--error);color:#fff;">
                                    <i class="bi bi-x-circle"></i> Revoke
                                </button>` : ''}
                        </div>
                    </div>`;
            }).join('');

        } catch (error) {
            console.error('Load keys error:', error);
            document.getElementById('keysList').innerHTML = `
                <div class="content-section alert alert-error">Failed to load keys: ${error.message}</div>`;
        }
    }

    //Generate a new key
    document.getElementById('generateKeyBtn').addEventListener('click', async () => {
        const errorEl = document.getElementById('keyError');
        const successEl = document.getElementById('keySuccess');
        errorEl.style.display = 'none';
        successEl.style.display = 'none';

        const clientName = document.getElementById('clientName').value.trim();
        if (!clientName) {
            errorEl.textContent = 'Client name is required.';
            errorEl.style.display = 'block';
            return;
        }

        const permissions = Array.from(document.querySelectorAll('.perm-check:checked')).map(cb => cb.value);

        try {
            const res = await fetch('/api/keys', {
                method: 'POST',
                headers,
                body: JSON.stringify({ client_name: clientName, permissions })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            document.getElementById('newKeyValue').textContent = data.api_key;
            document.getElementById('newKeyDisplay').style.display = 'block';
            document.getElementById('clientName').value = '';

            successEl.textContent = data.message;
            successEl.style.display = 'block';

            loadKeys();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
        }
    });

    //Event delegation for Revoke and Stats buttons
    document.getElementById('keysList').addEventListener('click', async (e) => {
        const revokeBtn = e.target.closest('.btn-revoke-key');
        const statsBtn = e.target.closest('.btn-stats-key');

        if (revokeBtn) {
            if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;
            const id = revokeBtn.dataset.keyId;
            revokeBtn.disabled = true;
            revokeBtn.textContent = 'Revoking...';
            try {
                const res = await fetch(`/api/keys/${id}`, { method: 'DELETE', headers });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                loadKeys();
            } catch (error) {
                alert('Error revoking key: ' + error.message);
                revokeBtn.disabled = false;
                revokeBtn.innerHTML = '<i class="bi bi-x-circle"></i> Revoke';
            }
        }

        if (statsBtn) {
            const id = statsBtn.dataset.keyId;
            try {
                const res = await fetch(`/api/keys/${id}/stats`, { headers });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                alert(`Total Requests: ${data.usage.total_requests}\nLast Used: ${data.usage.last_used || 'Never'}`);
            } catch (error) {
                alert('Error loading stats: ' + error.message);
            }
        }
    });

    //Init
    loadKeys();
})();
