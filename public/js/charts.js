document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = window.__API_KEY__ || localStorage.getItem('apiKey') || '';
    const headers = { 'x-api-key': API_KEY };

    //Color palettes for charts
    const COLORS = [
        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
        '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
        '#a855f7', '#d946ef'
    ];

    const COLORS_ALPHA = COLORS.map(c => c + '99');

    //Store chart instances for cleanup on re-render
    const chartInstances = {};

    //Active sidebar link
    const dashNav = document.getElementById('nav-dashboard');
    if (dashNav) dashNav.classList.add('active');

    //Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    //Sidebar toggle for mobile
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    // ── Load filter dropdowns ──
    async function loadFilters() {
        try {
            const res = await fetch('/api/analytics/filters', { headers });
            if (!res.ok) return;
            const data = await res.json();

            const progSelect = document.getElementById('filterProgramme');
            const yearSelect = document.getElementById('filterYear');
            const secSelect = document.getElementById('filterSector');

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
            console.error('Failed to load filters:', err);
        }
    }

    //Load Alumni of the Day
    async function loadAlumniOfDay() {
        const container = document.getElementById('alumniOfDay');
        if (!container) return;
        try {
            const res = await fetch('/api/featured/today', { headers });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();

            if (!data.featured) {
                container.innerHTML = `
                    <div style="text-align:center;width:100%;padding:12px 0;">
                        <i class="bi bi-calendar-x" style="font-size:28px;color:var(--text-tertiary)"></i>
                        <p style="color:var(--text-secondary);margin-top:6px;font-size:14px;">No featured alumni today. Place a bid to be featured!</p>
                    </div>`;
                return;
            }

            const a = data.alumni;
            const degrees = (a.degrees || []).map(d => d.title).join(', ') || 'N/A';
            const employment = (a.employment_history || []).map(e => `${e.role} at ${e.company}`).join(', ') || 'N/A';

            container.innerHTML = `
                <img src="${a.profile_image_url || '/uploads/default.png'}" alt="Featured Alumni"
                     style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #f5c542;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <h3 style="font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">
                        <i class="bi bi-trophy-fill" style="color:#f5c542;margin-right:4px;"></i>
                        ${a.email}
                    </h3>
                    <p style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">${a.bio || 'No bio available.'}</p>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--text-tertiary);">
                        <span><i class="bi bi-mortarboard"></i> ${degrees}</span>
                        <span><i class="bi bi-briefcase"></i> ${employment}</span>
                        ${a.linkedin_url ? `<a href="${a.linkedin_url}" target="_blank" style="color:var(--accent);"><i class="bi bi-linkedin"></i> LinkedIn</a>` : ''}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Alumni of Day error:', err);
            container.innerHTML = `<p style="color:var(--text-tertiary);font-size:14px;">Unable to load featured alumni.</p>`;
        }
    }

    //Build query string from current filters
    function getFilterQuery() {
        const programme = document.getElementById('filterProgramme').value;
        const year = document.getElementById('filterYear').value;
        const sector = document.getElementById('filterSector').value;
        const params = new URLSearchParams();
        if (programme) params.set('programme', programme);
        if (year) params.set('graduation_year', year);
        if (sector) params.set('sector', sector);
        return params.toString() ? '?' + params.toString() : '';
    }

    // ── Generic fetch helper ──
    async function fetchChartData(endpoint) {
        const res = await fetch(`/api/analytics/${endpoint}${getFilterQuery()}`, { headers });
        if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
        return res.json();
    }

    //Destroy existing chart before re-creating
    function createChart(canvasId, config) {
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }
        const ctx = document.getElementById(canvasId).getContext('2d');
        chartInstances[canvasId] = new Chart(ctx, config);
        return chartInstances[canvasId];
    }

    // ── 1. Employment by Sector (Bar) ──
    async function renderSectorChart() {
        const { data } = await fetchChartData('by-sector');
        createChart('sectorChart', {
            type: 'bar',
            data: {
                labels: data.map(d => d.sector || 'Unknown'),
                datasets: [{
                    label: 'Number of Alumni',
                    data: data.map(d => d.count),
                    backgroundColor: COLORS_ALPHA,
                    borderColor: COLORS,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    }

    // ── 2. Alumni by Programme (Pie) ──
    async function renderProgrammeChart() {
        const { data } = await fetchChartData('by-programme');
        createChart('programmeChart', {
            type: 'pie',
            data: {
                labels: data.map(d => d.programme || 'Unknown'),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: COLORS,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
                    tooltip: {
                        backgroundColor: '#1e293b', cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.raw / total) * 100).toFixed(1);
                                return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                },
                animation: { animateRotate: true, duration: 800 }
            }
        });
    }

    // ── 3. Alumni by Industry (Doughnut) ──
    async function renderIndustryChart() {
        const { data } = await fetchChartData('by-industry');
        createChart('industryChart', {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.industry || 'Unknown'),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: COLORS,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                animation: { animateRotate: true, duration: 800 }
            }
        });
    }

    // ── 4. Graduation Trends (Line) ──
    async function renderGradTrendsChart() {
        const { data } = await fetchChartData('graduation-trends');
        createChart('gradTrendsChart', {
            type: 'line',
            data: {
                labels: data.map(d => d.year),
                datasets: [{
                    label: 'Graduates',
                    data: data.map(d => d.count),
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#6366f1',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                animation: { duration: 1000, easing: 'easeOutQuart' }
            }
        });
    }

    // ── 5. Skills Gap (Radar) ──
    async function renderSkillsGapChart() {
        const { data } = await fetchChartData('skills-gap');
        const top12 = data.slice(0, 12);
        createChart('skillsGapChart', {
            type: 'radar',
            data: {
                labels: top12.map(d => d.skill),
                datasets: [
                    {
                        label: 'University (Taught)',
                        data: top12.map(d => d.university_count),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        pointBackgroundColor: '#3b82f6',
                        borderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: 'Industry (Used)',
                        data: top12.map(d => d.industry_count),
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249,115,22,0.15)',
                        pointBackgroundColor: '#f97316',
                        borderWidth: 2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: { stepSize: 2 },
                        pointLabels: { font: { size: 11 } }
                    }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                animation: { duration: 800 }
            }
        });
    }

    // ── 6. Top Job Titles (Horizontal Bar) ──
    async function renderJobTitlesChart() {
        const { data } = await fetchChartData('top-job-titles');
        createChart('jobTitlesChart', {
            type: 'bar',
            data: {
                labels: data.map(d => d.role),
                datasets: [{
                    label: 'Count',
                    data: data.map(d => d.count),
                    backgroundColor: COLORS_ALPHA.slice(0, data.length),
                    borderColor: COLORS.slice(0, data.length),
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1 } },
                    y: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    }

    // ── 7. Top Employers (Bar) ──
    async function renderEmployersChart() {
        const { data } = await fetchChartData('top-employers');
        createChart('employersChart', {
            type: 'bar',
            data: {
                labels: data.map(d => d.company),
                datasets: [{
                    label: 'Alumni',
                    data: data.map(d => d.count),
                    backgroundColor: COLORS_ALPHA,
                    borderColor: COLORS,
                    borderWidth: 2,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { maxRotation: 45 } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
    }

    // ── 8. Geographic Distribution (Polar Area) ──
    async function renderGeoChart() {
        const { data } = await fetchChartData('geographic');
        createChart('geoChart', {
            type: 'polarArea',
            data: {
                labels: data.map(d => d.location || 'Unknown'),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: COLORS_ALPHA,
                    borderColor: COLORS,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
                    tooltip: { backgroundColor: '#1e293b', cornerRadius: 8 }
                },
                scales: {
                    r: { beginAtZero: true, ticks: { stepSize: 1 } }
                },
                animation: { animateRotate: true, duration: 800 }
            }
        });
    }

    // ── Render all charts ──
    async function renderAllCharts() {
        const renderers = [
            renderSectorChart, renderProgrammeChart, renderIndustryChart,
            renderGradTrendsChart, renderSkillsGapChart, renderJobTitlesChart,
            renderEmployersChart, renderGeoChart
        ];

        for (const render of renderers) {
            try { await render(); } catch (err) { console.error('Chart error:', err); }
        }
    }

    // ── Filter button handlers ──
    document.getElementById('applyFilters')?.addEventListener('click', renderAllCharts);

    document.getElementById('clearFilters')?.addEventListener('click', () => {
        document.getElementById('filterProgramme').value = '';
        document.getElementById('filterYear').value = '';
        document.getElementById('filterSector').value = '';
        renderAllCharts();
    });

    // ── Chart download buttons ──
    document.querySelectorAll('.chart-download').forEach(btn => {
        btn.addEventListener('click', () => {
            const chartId = btn.dataset.chart;
            const chart = chartInstances[chartId];
            if (!chart) return;

            const srcCanvas = chart.canvas;
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = srcCanvas.width;
            tempCanvas.height = srcCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = '#ffffff';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(srcCanvas, 0, 0);

            const link = document.createElement('a');
            link.download = `${chartId}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        });
    });

    //PDF Export
    const chartTitles = {
        sectorChart: 'Employment by Industry Sector',
        programmeChart: 'Alumni Distribution by Programme',
        industryChart: 'Alumni by Current Industry',
        gradTrendsChart: 'Graduation Trends Over Time',
        skillsGapChart: 'Curriculum Skills Gap Analysis',
        jobTitlesChart: 'Most Common Job Titles',
        employersChart: 'Top Employers',
        geoChart: 'Geographic Distribution'
    };

    document.getElementById('exportPdfBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('exportPdfBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            //Title page
            pdf.setFontSize(22);
            pdf.setTextColor(30, 41, 59);
            pdf.text('Alumni Influencers', 14, 25);
            pdf.setFontSize(14);
            pdf.setTextColor(100, 116, 139);
            pdf.text('Analytics Report', 14, 34);
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);

            let yPos = 60;

            //Render each chart
            const chartIds = Object.keys(chartTitles);
            for (const chartId of chartIds) {
                const chart = chartInstances[chartId];
                if (!chart) continue;

                const title = chartTitles[chartId];
                const imgData = chart.toBase64Image('image/png', 1);

                const canvas = chart.canvas;
                const imgWidth = 180;
                const imgHeight = (canvas.height / canvas.width) * imgWidth;

                //Check if we need a new page
                if (yPos + imgHeight + 10 > 280) {
                    pdf.addPage();
                    yPos = 20;
                }

                //Chart title
                pdf.setFontSize(13);
                pdf.setTextColor(30, 41, 59);
                pdf.text(title, 14, yPos);
                yPos += 6;

                //Chart image
                pdf.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 14;
            }

            pdf.save('alumni-analytics-report.pdf');
        } catch (err) {
            console.error('PDF export error:', err);
            alert('PDF export failed. Please try again.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Export PDF';
        }
    });

    // ── Init ──
    loadFilters();
    loadAlumniOfDay();
    renderAllCharts();
});
