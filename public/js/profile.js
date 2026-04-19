document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = window.__API_KEY__ || '';
    const TOKEN = localStorage.getItem('token') || '';
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${TOKEN}`
    };

    //Active nav
    document.getElementById('nav-profile')?.classList.add('active');

    //Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    //Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    //Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
        });
    });

    //Toast helper
    function showToast(msg) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ── Load base profile ──
    async function loadProfile() {
        try {
            const res = await fetch('/api/profile/me', { headers });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            const p = data.profile;

            document.getElementById('firstName').value = p.first_name || '';
            document.getElementById('lastName').value = p.last_name || '';
            document.getElementById('programme').value = p.programme || '';
            document.getElementById('graduationDate').value = p.graduation_date ? p.graduation_date.split('T')[0] : '';
            document.getElementById('industrySector').value = p.industry_sector || '';
            document.getElementById('location').value = p.location || '';
            document.getElementById('bio').value = p.bio || '';
            document.getElementById('linkedinUrl').value = p.linkedin_url || '';

            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'No Name';
            document.getElementById('profileName').textContent = name;
            document.getElementById('profileEmail').textContent = '';

            if (p.profile_image_url) {
                document.getElementById('profileAvatar').src = p.profile_image_url;
            }

            //Load completion
            try {
                const compRes = await fetch('/api/profile/me/completion', { headers });
                if (compRes.ok) {
                    const compData = await compRes.json();
                    const pct = compData.completion_percentage || 0;
                    document.getElementById('completionBar').style.width = pct + '%';
                    document.getElementById('completionText').textContent = pct + '% complete';
                }
            } catch (e) { /* ignore */ }

        } catch (err) {
            console.error('Profile load error:', err);
        }
    }

    // ── Load sub-items separately from their own endpoints ──
    async function loadDegrees() {
        try {
            const res = await fetch('/api/profile/me/degrees', { headers });
            if (!res.ok) return;
            const data = await res.json();
            renderList('degreesList', data.degrees || data, 'degree');
        } catch (err) { console.error('Degrees error:', err); }
    }

    async function loadEmployment() {
        try {
            const res = await fetch('/api/profile/me/employment', { headers });
            if (!res.ok) return;
            const data = await res.json();
            renderList('employmentList', data.employment || data, 'employment');
        } catch (err) { console.error('Employment error:', err); }
    }

    async function loadCertifications() {
        try {
            const res = await fetch('/api/profile/me/certifications', { headers });
            if (!res.ok) return;
            const data = await res.json();
            renderList('certsList', data.certifications || data, 'certification');
        } catch (err) { console.error('Certifications error:', err); }
    }

    async function loadLicences() {
        try {
            const res = await fetch('/api/profile/me/licences', { headers });
            if (!res.ok) return;
            const data = await res.json();
            renderList('licencesList', data.licences || data, 'licence');
        } catch (err) { console.error('Licences error:', err); }
    }

    //Render a list of data items
    function renderList(containerId, items, type) {
        const container = document.getElementById(containerId);
        if (!items || items.length === 0) {
            container.innerHTML = `<p style="color:var(--text-tertiary);font-size:14px;padding:12px 0;">No ${type}s added yet.</p>`;
            return;
        }

        container.innerHTML = items.map(item => {
            let title = '', subtitle = '', extra = '';
            if (type === 'degree') {
                title = item.title;
                subtitle = item.completion_date || '';
                extra = item.official_url ? `<a href="${item.official_url}" target="_blank" style="font-size:13px;color:var(--accent)"><i class="bi bi-link-45deg"></i> URL</a>` : '';
            } else if (type === 'employment') {
                title = `${item.role} at ${item.company}`;
                subtitle = `${item.start_date || ''} → ${item.end_date || 'Present'}`;
                extra = item.industry_sector ? `<span style="font-size:13px;color:var(--text-tertiary)">${item.industry_sector}</span>` : '';
            } else if (type === 'certification') {
                title = item.title;
                subtitle = item.completion_date || '';
                extra = item.url ? `<a href="${item.url}" target="_blank" style="font-size:13px;color:var(--accent)"><i class="bi bi-link-45deg"></i> URL</a>` : '';
            } else if (type === 'licence') {
                title = item.title;
                subtitle = item.completion_date || '';
                extra = item.url ? `<a href="${item.url}" target="_blank" style="font-size:13px;color:var(--accent)"><i class="bi bi-link-45deg"></i> URL</a>` : '';
            }

            return `
                <div class="data-item">
                    <div class="data-item-info">
                        <h4>${title}</h4>
                        <p>${subtitle} ${extra}</p>
                    </div>
                    <div class="data-item-actions">
                        <button class="btn-icon delete" data-type="${type}" data-id="${item.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        //Delete handlers
        container.querySelectorAll('.btn-icon.delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const t = btn.dataset.type;
                const id = btn.dataset.id;
                let endpoint = '';
                if (t === 'degree') endpoint = `/api/profile/me/degrees/${id}`;
                else if (t === 'employment') endpoint = `/api/profile/me/employment/${id}`;
                else if (t === 'certification') endpoint = `/api/profile/me/certifications/${id}`;
                else if (t === 'licence') endpoint = `/api/profile/me/licences/${id}`;

                if (!confirm('Delete this item?')) return;
                try {
                    await fetch(endpoint, { method: 'DELETE', headers });
                    showToast('Deleted successfully');
                    loadAll();
                } catch (err) { console.error(err); }
            });
        });
    }

    //Save profile
    document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('saveProfileBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const body = {
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                programme: document.getElementById('programme').value,
                graduation_date: document.getElementById('graduationDate').value || null,
                industry_sector: document.getElementById('industrySector').value,
                location: document.getElementById('location').value,
                bio: document.getElementById('bio').value,
                linkedin_url: document.getElementById('linkedinUrl').value
            };

            const res = await fetch('/api/profile/me', {
                method: 'PUT', headers, body: JSON.stringify(body)
            });

            if (res.ok) {
                showToast('Profile saved!');
                loadProfile();
            } else {
                const data = await res.json();
                showToast(data.error || 'Save failed');
            }
        } catch (err) {
            showToast('Network error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    });

    //Avatar upload
    document.getElementById('avatarUpload')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profileImage', file);

        showToast('Uploading photo...');
        try {
            const res = await fetch('/api/profile/me/image', {
                method: 'POST',
                headers: {
                    'x-api-key': API_KEY,
                    'Authorization': `Bearer ${TOKEN}`
                },
                body: formData
            });

            if (res.ok) {
                showToast('Photo updated!');
                loadProfile();
            } else {
                const data = await res.json();
                showToast(data.error || 'Upload failed');
            }
        } catch (err) { console.error(err); }
    });

    //Add modals
    const modal = document.getElementById('profileModal');
    const modalForm = document.getElementById('modalForm');
    const modalTitle = document.getElementById('modalTitle');
    let currentAddType = '';

    function openAddModal(type) {
        currentAddType = type;
        modal.style.display = 'flex';

        if (type === 'degree') {
            modalTitle.textContent = 'Add Degree';
            modalForm.innerHTML = `
                <div class="form-group"><label>Title</label><input type="text" id="modalField1" placeholder="BSc Computer Science" required></div>
                <div class="form-group"><label>Official URL</label><input type="url" id="modalField2" placeholder="https://university.ac.uk/course" required></div>
                <div class="form-group"><label>Completion Date</label><input type="date" id="modalField3"></div>
            `;
        } else if (type === 'employment') {
            modalTitle.textContent = 'Add Employment';
            modalForm.innerHTML = `
                <div class="form-group"><label>Role</label><input type="text" id="modalField1" placeholder="Software Engineer" required></div>
                <div class="form-group"><label>Company</label><input type="text" id="modalField2" placeholder="Google" required></div>
                <div class="form-group"><label>Start Date</label><input type="date" id="modalField3" required></div>
                <div class="form-group"><label>End Date</label><input type="date" id="modalField4"></div>
                <div class="form-group"><label>Industry Sector</label><input type="text" id="modalField5" placeholder="Technology"></div>
            `;
        } else if (type === 'certification') {
            modalTitle.textContent = 'Add Certification';
            modalForm.innerHTML = `
                <div class="form-group"><label>Title</label><input type="text" id="modalField1" placeholder="AWS Solutions Architect" required></div>
                <div class="form-group"><label>URL</label><input type="url" id="modalField2" placeholder="https://cert-provider.com/cert" required></div>
                <div class="form-group"><label>Completion Date</label><input type="date" id="modalField3"></div>
            `;
        } else if (type === 'licence') {
            modalTitle.textContent = 'Add Licence';
            modalForm.innerHTML = `
                <div class="form-group"><label>Title</label><input type="text" id="modalField1" placeholder="Professional Engineering Licence" required></div>
                <div class="form-group"><label>URL</label><input type="url" id="modalField2" placeholder="https://licensing-body.org" required></div>
                <div class="form-group"><label>Completion Date</label><input type="date" id="modalField3"></div>
            `;
        }
    }

    document.getElementById('addDegreeBtn')?.addEventListener('click', () => openAddModal('degree'));
    document.getElementById('addEmploymentBtn')?.addEventListener('click', () => openAddModal('employment'));
    document.getElementById('addCertBtn')?.addEventListener('click', () => openAddModal('certification'));
    document.getElementById('addLicenceBtn')?.addEventListener('click', () => openAddModal('licence'));

    document.getElementById('closeProfileModal')?.addEventListener('click', () => modal.style.display = 'none');
    modal?.addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.style.display = 'none'; });

    document.getElementById('modalSaveBtn')?.addEventListener('click', async () => {
        let endpoint = '', body = {};

        if (currentAddType === 'degree') {
            endpoint = '/api/profile/me/degrees';
            body = {
                title: document.getElementById('modalField1').value,
                official_url: document.getElementById('modalField2').value,
                completion_date: document.getElementById('modalField3').value || null
            };
        } else if (currentAddType === 'employment') {
            endpoint = '/api/profile/me/employment';
            body = {
                role: document.getElementById('modalField1').value,
                company: document.getElementById('modalField2').value,
                start_date: document.getElementById('modalField3').value,
                end_date: document.getElementById('modalField4').value || null,
                industry_sector: document.getElementById('modalField5').value || null
            };
        } else if (currentAddType === 'certification') {
            endpoint = '/api/profile/me/certifications';
            body = {
                title: document.getElementById('modalField1').value,
                url: document.getElementById('modalField2').value,
                completion_date: document.getElementById('modalField3').value || null
            };
        } else if (currentAddType === 'licence') {
            endpoint = '/api/profile/me/licences';
            body = {
                title: document.getElementById('modalField1').value,
                url: document.getElementById('modalField2').value,
                completion_date: document.getElementById('modalField3').value || null
            };
        }

        try {
            const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });
            if (res.ok) {
                showToast(`${currentAddType} added!`);
                modal.style.display = 'none';
                loadAll();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to add');
            }
        } catch (err) { showToast('Network error'); }
    });

    //Load everything
    function loadAll() {
        loadProfile();
        loadDegrees();
        loadEmployment();
        loadCertifications();
        loadLicences();
    }

    loadAll();
});
