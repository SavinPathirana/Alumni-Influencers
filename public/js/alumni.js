document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = window.__API_KEY__ || '';
    const token = localStorage.getItem('token');
    const headers = { 'x-api-key': API_KEY };

    //Detect user role from JWT
    let userRole = 'alumni';
    try {
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.role || 'alumni';
            console.log('[Alumni Page] Detected role:', userRole, '| User ID:', payload.userId);
        }
    } catch (e) {
        console.error('[Alumni Page] Failed to decode JWT:', e);
    }

    //Auth headers for sponsor API calls (JWT bypasses API key requirement)
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    let currentPage = 1;

    //Active sidebar link
    const alumniNav = document.getElementById('nav-alumni');
    if (alumniNav) alumniNav.classList.add('active');

    //Show sponsor mode banner for sponsor users
    if (userRole === 'sponsor') {
        const header = document.querySelector('.top-bar');
        if (header) {
            const banner = document.createElement('div');
            banner.style.cssText = 'background:rgba(168,85,247,0.1);color:#a855f7;padding:10px 16px;font-size:14px;font-weight:600;border-bottom:1px solid rgba(168,85,247,0.2);display:flex;align-items:center;gap:8px;';
            banner.innerHTML = '<i class="bi bi-cash-coin"></i> Sponsor Mode — Click "View" on any alumni to sponsor their credentials';
            header.parentNode.insertBefore(banner, header.nextSibling);
        }
    }

    //Sector badge class mapping
    const sectorBadge = (sector) => {
        const map = {
            'Technology': 'badge-tech', 'Finance': 'badge-finance',
            'Healthcare': 'badge-health', 'Consulting': 'badge-consult',
            'Media': 'badge-media', 'Education': 'badge-edu',
            'Government': 'badge-gov', 'Retail': 'badge-retail'
        };
        return map[sector] || 'badge-tech';
    };

    //Load filter dropdowns
    async function loadFilters() {
        try {
            const res = await fetch('/api/analytics/filters', { headers });
            if (!res.ok) return;
            const data = await res.json();

            const progSelect = document.getElementById('alumniProgramme');
            const yearSelect = document.getElementById('alumniYear');
            const secSelect = document.getElementById('alumniSector');

            data.programmes.forEach(p => {
                progSelect.innerHTML += `<option value="${p}">${p}</option>`;
            });
            data.graduation_years.forEach(y => {
                yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
            });
            data.sectors.forEach(s => {
                secSelect.innerHTML += `<option value="${s}">${s}</option>`;
            });
        } catch (err) {
            console.error('Filters error:', err);
        }
    }

    //Build query string
    function getFilterQuery(page) {
        const programme = document.getElementById('alumniProgramme').value;
        const year = document.getElementById('alumniYear').value;
        const sector = document.getElementById('alumniSector').value;
        const params = new URLSearchParams();
        if (programme) params.set('programme', programme);
        if (year) params.set('graduation_year', year);
        if (sector) params.set('sector', sector);
        params.set('page', page);
        params.set('limit', 15);
        return '?' + params.toString();
    }

    //Load alumni table
    async function loadAlumni(page = 1) {
        currentPage = page;
        const tbody = document.getElementById('alumniTableBody');
        tbody.innerHTML = `<tr><td colspan="6" class="loading-cell"><div class="spinner"></div><span>Loading alumni...</span></td></tr>`;

        try {
            const res = await fetch(`/api/analytics/alumni${getFilterQuery(page)}`, { headers });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            if (data.alumni.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="loading-cell"><i class="bi bi-inbox" style="font-size:32px;color:var(--text-light)"></i><span>No alumni found matching your filters.</span></td></tr>`;
                document.getElementById('pagination').innerHTML = '';
                return;
            }

            tbody.innerHTML = data.alumni.map(a => `
                <tr>
                    <td class="name-cell">${a.first_name || ''} ${a.last_name || ''}</td>
                    <td>${a.programme || '—'}</td>
                    <td>${a.graduation_date ? new Date(a.graduation_date).getFullYear() : '—'}</td>
                    <td><span class="badge ${sectorBadge(a.industry_sector)}">${a.industry_sector || '—'}</span></td>
                    <td>${a.location || '—'}</td>
                    <td><button class="btn-view" data-profile-id="${a.id}">View</button></td>
                </tr>
            `).join('');

            renderPagination(data.page, data.pages, data.total);
        } catch (err) {
            console.error('Alumni load error:', err);
            tbody.innerHTML = `<tr><td colspan="6" class="loading-cell"><span>Failed to load alumni. Check API key.</span></td></tr>`;
        }
    }

    //Render pagination
    function renderPagination(current, totalPages, totalItems) {
        const pag = document.getElementById('pagination');
        if (totalPages <= 1) { pag.innerHTML = ''; return; }

        let html = `<button data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}>‹ Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button data-page="${i}" class="${i === current ? 'active' : ''}">${i}</button>`;
        }
        html += `<button data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}>Next ›</button>`;
        pag.innerHTML = html;
    }

    //Pagination click handler (event delegation)
    document.getElementById('pagination')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-page]');
        if (btn && !btn.disabled) {
            loadAlumni(parseInt(btn.dataset.page));
        }
    });

    //View button click handler (event delegation)
    document.getElementById('alumniTableBody')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view');
        if (btn) {
            viewAlumni(parseInt(btn.dataset.profileId));
        }
    });

    //Helper: render credential items with optional sponsor button
    function renderCredentialItem(credential, type, alumniUserId) {
        const sponsorBtn = userRole === 'sponsor'
            ? `<button class="btn-sponsor-offer" data-user-id="${alumniUserId}" data-type="${type}" data-cred-id="${credential.id}" data-title="${credential.title}" style="margin-left:auto;padding:4px 12px;font-size:12px;font-weight:600;background:rgba(168,85,247,0.15);color:#a855f7;border:1px solid rgba(168,85,247,0.3);border-radius:9999px;cursor:pointer;font-family:inherit;transition:all 0.2s;"><i class="bi bi-cash-coin"></i> Sponsor</button>`
            : '';
        return `<div class="section-item" style="display:flex;align-items:center;gap:8px;">
            <div><strong>${credential.title}</strong> <span>— ${credential.completion_date || ''}</span></div>
            ${sponsorBtn}
        </div>`;
    }

    //View alumni detail modal
    async function viewAlumni(profileId) {
        const modal = document.getElementById('alumniModal');
        const content = document.getElementById('modalContent');
        modal.style.display = 'flex';
        content.innerHTML = '<div class="spinner" style="margin:40px auto;"></div>';

        try {
            const res = await fetch(`/api/analytics/alumni?limit=100`, { headers });
            const data = await res.json();
            const alumni = data.alumni.find(a => a.id === profileId);

            if (!alumni) {
                content.innerHTML = '<p>Alumni not found.</p>';
                return;
            }

            const alumniUserId = alumni.User ? alumni.User.id : null;

            content.innerHTML = `
                <h2>${alumni.first_name || ''} ${alumni.last_name || ''}</h2>
                <div class="profile-meta">
                    <span><i class="bi bi-mortarboard"></i> ${alumni.programme || '—'}</span>
                    <span><i class="bi bi-calendar"></i> ${alumni.graduation_date ? new Date(alumni.graduation_date).getFullYear() : '—'}</span>
                    <span><i class="bi bi-briefcase"></i> ${alumni.industry_sector || '—'}</span>
                    <span><i class="bi bi-geo-alt"></i> ${alumni.location || '—'}</span>
                </div>

                ${alumni.bio ? `<div class="section"><h4>Bio</h4><p style="font-size:14px;color:var(--text-secondary)">${alumni.bio}</p></div>` : ''}

                ${alumni.Degrees && alumni.Degrees.length > 0 ? `
                    <div class="section">
                        <h4>Degrees</h4>
                        ${alumni.Degrees.map(d => `<div class="section-item"><strong>${d.title}</strong> <span>— ${d.completion_date || ''}</span></div>`).join('')}
                    </div>
                ` : ''}

                ${alumni.Certifications && alumni.Certifications.length > 0 ? `
                    <div class="section">
                        <h4>Certifications</h4>
                        ${alumni.Certifications.map(c => renderCredentialItem(c, 'Certification', alumniUserId)).join('')}
                    </div>
                ` : ''}

                ${alumni.Licences && alumni.Licences.length > 0 ? `
                    <div class="section">
                        <h4>Licences</h4>
                        ${alumni.Licences.map(l => renderCredentialItem(l, 'Licence', alumniUserId)).join('')}
                    </div>
                ` : ''}

                ${alumni.ProfessionalCourses && alumni.ProfessionalCourses.length > 0 ? `
                    <div class="section">
                        <h4>Professional Courses</h4>
                        ${alumni.ProfessionalCourses.map(p => renderCredentialItem(p, 'ProfessionalCourse', alumniUserId)).join('')}
                    </div>
                ` : ''}

                ${alumni.Employments && alumni.Employments.length > 0 ? `
                    <div class="section">
                        <h4>Employment History</h4>
                        ${alumni.Employments.map(e => `<div class="section-item"><strong>${e.role}</strong> at ${e.company} <span>(${e.industry_sector || ''})</span></div>`).join('')}
                    </div>
                ` : ''}

                ${alumni.Skills && alumni.Skills.length > 0 ? `
                    <div class="section">
                        <h4>Skills</h4>
                        <div class="skills-list">
                            ${alumni.Skills.map(s => `<span class="skill-tag ${s.source}">${s.skill_name}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${alumni.linkedin_url ? `<a href="${alumni.linkedin_url}" target="_blank" class="btn btn-primary" style="margin-top:12px;"><i class="bi bi-linkedin"></i> LinkedIn Profile</a>` : ''}

                ${userRole === 'sponsor' ? (() => {
                    const allCreds = [
                        ...(alumni.Certifications || []).map(c => ({ ...c, _type: 'Certification' })),
                        ...(alumni.Licences || []).map(l => ({ ...l, _type: 'Licence' })),
                        ...(alumni.ProfessionalCourses || []).map(p => ({ ...p, _type: 'ProfessionalCourse' }))
                    ];
                    if (allCreds.length === 0) {
                        return `
                            <div class="section" style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px;">
                                <h4 style="color:#a855f7;"><i class="bi bi-cash-coin"></i> SPONSOR THIS ALUMNI</h4>
                                <p style="font-size:14px;color:var(--text-secondary);padding:12px 0;">This alumni has no certifications, licences, or professional courses to sponsor yet.</p>
                            </div>`;
                    }
                    return `
                        <div class="section" style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px;">
                            <h4 style="color:#a855f7;"><i class="bi bi-cash-coin"></i> SPONSOR THIS ALUMNI</h4>
                            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">Select a credential below to send a sponsorship offer:</p>
                            ${allCreds.map(cred => `
                                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);">
                                    <div>
                                        <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-tertiary);">${cred._type}</span>
                                        <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${cred.title}</div>
                                    </div>
                                    <button class="btn-sponsor-offer" data-user-id="${alumniUserId}" data-type="${cred._type}" data-cred-id="${cred.id}" data-title="${cred.title}" style="padding:6px 14px;font-size:12px;font-weight:600;background:rgba(168,85,247,0.15);color:#a855f7;border:1px solid rgba(168,85,247,0.3);border-radius:9999px;cursor:pointer;font-family:inherit;transition:all 0.2s;">
                                        <i class="bi bi-cash-coin"></i> Sponsor
                                    </button>
                                </div>
                            `).join('')}
                        </div>`;
                })() : ''}

                <div id="sponsorOfferFeedback" style="margin-top:12px;display:none;" class="alert"></div>
            `;
        } catch (err) {
            content.innerHTML = '<p>Failed to load alumni details.</p>';
        }
    };

    //Handle sponsor offer button clicks (event delegation on modal)
    document.getElementById('modalContent')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-sponsor-offer');
        if (!btn) return;

        //Toggle inline offer form
        const existing = btn.parentElement.querySelector('.sponsor-offer-form');
        if (existing) { existing.remove(); return; }

        const form = document.createElement('div');
        form.className = 'sponsor-offer-form';
        form.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;width:100%;';
        form.innerHTML = `
            <input type="number" min="1" step="0.01" placeholder="Amount (£)" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;width:120px;outline:none;font-family:inherit;">
            <button class="submit-offer-btn" style="padding:6px 14px;font-size:12px;font-weight:600;background:var(--accent);color:#fff;border:none;border-radius:9999px;cursor:pointer;font-family:inherit;">Send Offer</button>
        `;
        btn.parentElement.appendChild(form);

        form.querySelector('.submit-offer-btn').addEventListener('click', async () => {
            const amount = parseFloat(form.querySelector('input').value);
            if (!amount || amount <= 0) { alert('Enter a valid amount.'); return; }

            const submitBtn = form.querySelector('.submit-offer-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            const reqBody = {
                alumni_user_id: parseInt(btn.dataset.userId),
                credential_type: btn.dataset.type,
                credential_id: parseInt(btn.dataset.credId),
                offer_amount: amount
            };

            console.log('[Sponsor] Sending offer:', reqBody);
            console.log('[Sponsor] Headers:', authHeaders);

            const feedback = document.getElementById('sponsorOfferFeedback');
            try {
                const res = await fetch('/api/sponsorships/offers', {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify(reqBody)
                });
                const data = await res.json();
                console.log('[Sponsor] Response:', res.status, data);

                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

                if (feedback) {
                    feedback.className = 'alert alert-success';
                    feedback.textContent = `✅ Offer of £${amount.toFixed(2)} sent for "${btn.dataset.title}"!`;
                    feedback.style.display = 'block';
                    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                form.remove();
                btn.disabled = true;
                btn.textContent = '✓ Sent';
                btn.style.opacity = '0.5';
            } catch (err) {
                console.error('[Sponsor] Offer error:', err);
                if (feedback) {
                    feedback.className = 'alert alert-error';
                    feedback.textContent = `❌ ${err.message}`;
                    feedback.style.display = 'block';
                    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    alert('Error: ' + err.message);
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Offer';
            }
        });
    });

    //Close modal
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('alumniModal').style.display = 'none';
    });
    document.getElementById('alumniModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });

    //Filter handlers
    document.getElementById('alumniApplyFilters')?.addEventListener('click', () => loadAlumni(1));
    document.getElementById('alumniClearFilters')?.addEventListener('click', () => {
        document.getElementById('alumniProgramme').value = '';
        document.getElementById('alumniYear').value = '';
        document.getElementById('alumniSector').value = '';
        loadAlumni(1);
    });

    //CSV Export
    document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('exportCsvBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Exporting...';

        try {
            const res = await fetch(`/api/analytics/alumni${getFilterQuery(1)}&limit=1000`, { headers });
            const data = await res.json();

            const csv = [
                ['Name', 'Email', 'Programme', 'Graduation Date', 'Industry', 'Location'].join(','),
                ...data.alumni.map(a => [
                    `"${(a.first_name || '') + ' ' + (a.last_name || '')}"`,
                    `"${a.User?.email || ''}"`,
                    `"${a.programme || ''}"`,
                    `"${a.graduation_date || ''}"`,
                    `"${a.industry_sector || ''}"`,
                    `"${a.location || ''}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const link = document.createElement('a');
            link.download = `alumni-export-${new Date().toISOString().split('T')[0]}.csv`;
            link.href = URL.createObjectURL(blob);
            link.click();
        } catch (err) {
            alert('CSV export failed.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-filetype-csv"></i> Export CSV';
        }
    });

    //Init
    loadFilters();
    loadAlumni(1);
});
