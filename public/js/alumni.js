document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = localStorage.getItem('apiKey') || '';
    const headers = { 'x-api-key': API_KEY };
    let currentPage = 1;

    //Active sidebar link
    const alumniNav = document.getElementById('nav-alumni');
    if (alumniNav) alumniNav.classList.add('active');

    //Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    //Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

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
                    <td><button class="btn-view" onclick="viewAlumni(${a.id})">View</button></td>
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

        let html = `<button ${current === 1 ? 'disabled' : ''} onclick="goToPage(${current - 1})">‹ Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        }
        html += `<button ${current === totalPages ? 'disabled' : ''} onclick="goToPage(${current + 1})">Next ›</button>`;
        pag.innerHTML = html;
    }

    //Global navigation
    window.goToPage = (page) => loadAlumni(page);

    //View alumni detail modal
    window.viewAlumni = async (profileId) => {
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
                        ${alumni.Certifications.map(c => `<div class="section-item"><strong>${c.title}</strong> <span>— ${c.completion_date || ''}</span></div>`).join('')}
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
            `;
        } catch (err) {
            content.innerHTML = '<p>Failed to load alumni details.</p>';
        }
    };

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
