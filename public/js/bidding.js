document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = window.__API_KEY__ || '';
    const TOKEN = localStorage.getItem('token') || '';
    const headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'Authorization': `Bearer ${TOKEN}`
    };

    //Active nav
    document.getElementById('nav-bidding')?.classList.add('active');

    //Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    //Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    //Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('bidTargetDate').min = tomorrow.toISOString().split('T')[0];

    //Toast
    function showToast(msg) {
        let toast = document.querySelector('.toast');
        if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    //Load monthly status from API
    async function loadMonthlyStatus() {
        try {
            const res = await fetch('/api/bidding/monthly-status', { headers });
            if (!res.ok) return;
            const data = await res.json();
            document.getElementById('winsThisMonth').textContent = data.wins_this_month || 0;
            document.getElementById('remainingSlots').textContent = data.remaining_slots || 3;
        } catch (err) { console.error('Monthly status error:', err); }
    }

    //Load tomorrow's slot status
    async function loadTomorrowSlot() {
        try {
            const res = await fetch('/api/bidding/tomorrow', { headers });
            if (!res.ok) {
                document.getElementById('tomorrowStatus').textContent = 'Unable to load slot status.';
                return;
            }
            const data = await res.json();
            const el = document.getElementById('tomorrowStatus');

            if (data.status === 'taken') {
                el.innerHTML = `<span style="color:var(--error)"><i class="bi bi-x-circle"></i> ${data.message}</span>`;
            } else {
                el.innerHTML = `<span style="color:var(--success)"><i class="bi bi-check-circle"></i> ${data.message}</span>`;
            }
        } catch (err) {
            document.getElementById('tomorrowStatus').textContent = 'Unable to load slot status.';
        }
    }

    //Load bids
    async function loadBids() {
        try {
            const res = await fetch('/api/bidding/me', { headers });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            const bids = data.bids || [];

            //Stats
            document.getElementById('totalBids').textContent = bids.length;

            //Render bids
            const container = document.getElementById('bidsList');
            if (bids.length === 0) {
                container.innerHTML = `<div class="content-section" style="text-align:center;padding:40px;">
                    <i class="bi bi-lightning" style="font-size:32px;color:var(--text-tertiary)"></i>
                    <p style="color:var(--text-secondary);margin-top:8px;">No bids placed yet.</p>
                </div>`;
                return;
            }

            container.innerHTML = bids.map(b => `
                <div class="bid-card">
                    <div class="bid-header">
                        <span class="bid-date">
                            <i class="bi bi-calendar-event"></i>
                            ${new Date(b.target_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span class="bid-status ${b.status}">${b.status.charAt(0).toUpperCase() + b.status.slice(1)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                        <span class="bid-amount">£${parseFloat(b.bid_amount).toFixed(2)}</span>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-outline btn-sm check-status-btn" data-id="${b.id}">
                                <i class="bi bi-info-circle"></i> Status
                            </button>
                            ${b.status === 'pending' ? `
                                <button class="btn btn-outline btn-sm update-bid-btn" data-id="${b.id}" data-amount="${b.bid_amount}">
                                    <i class="bi bi-pencil"></i> Update
                                </button>
                                <button class="btn btn-danger btn-sm cancel-bid-btn" data-id="${b.id}">
                                    <i class="bi bi-x"></i> Cancel
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            //Check status handlers
            container.querySelectorAll('.check-status-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const bidId = btn.dataset.id;
                    try {
                        const res = await fetch(`/api/bidding/${bidId}/status`, { headers });
                        const data = await res.json();
                        const content = document.getElementById('bidStatusContent');

                        if (res.ok) {
                            let statusColor = 'var(--text-secondary)';
                            if (data.status === 'won') statusColor = 'var(--success)';
                            else if (data.status === 'lost') statusColor = 'var(--error)';
                            else if (data.currently_winning) statusColor = 'var(--success)';

                            content.innerHTML = `
                                <div style="text-align:center;">
                                    <div style="font-size:48px;margin-bottom:12px;">
                                        ${data.status === 'won' ? '🏆' : data.status === 'lost' ? '😔' : data.currently_winning ? '🔥' : '⏳'}
                                    </div>
                                    <p style="font-size:17px;font-weight:700;color:${statusColor};">${data.feedback}</p>
                                    <div style="margin-top:16px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-xs);text-align:left;">
                                        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">
                                            <strong>Date:</strong> ${new Date(data.target_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">
                                            <strong>Your Bid:</strong> £${parseFloat(data.your_amount).toFixed(2)}
                                        </p>
                                        <p style="font-size:14px;color:var(--text-secondary);">
                                            <strong>Status:</strong> <span style="color:${statusColor}">${data.status.toUpperCase()}</span>
                                        </p>
                                        ${data.total_bids_for_date ? `<p style="font-size:14px;color:var(--text-secondary);margin-top:4px;"><strong>Competing bids:</strong> ${data.total_bids_for_date}</p>` : ''}
                                    </div>
                                </div>
                            `;
                        } else {
                            content.innerHTML = `<p style="color:var(--error)">${data.error || 'Failed to load status.'}</p>`;
                        }
                        document.getElementById('bidStatusModal').style.display = 'flex';
                    } catch (err) {
                        showToast('Failed to check status');
                    }
                });
            });

            //Update handlers
            container.querySelectorAll('.update-bid-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('currentBidAmount').value = '£' + parseFloat(btn.dataset.amount).toFixed(2);
                    document.getElementById('newBidAmount').value = '';
                    document.getElementById('updateBidModal').style.display = 'flex';
                    document.getElementById('updateBidBtn').dataset.bidId = btn.dataset.id;
                });
            });

            //Cancel handlers
            container.querySelectorAll('.cancel-bid-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Cancel this bid?')) return;
                    try {
                        const res = await fetch(`/api/bidding/${btn.dataset.id}`, { method: 'DELETE', headers });
                        if (res.ok) { showToast('Bid cancelled'); loadAll(); }
                        else { const d = await res.json(); showToast(d.error || 'Failed'); }
                    } catch (err) { showToast('Network error'); }
                });
            });

        } catch (err) {
            console.error('Load bids error:', err);
            document.getElementById('bidsList').innerHTML = `<div class="content-section" style="text-align:center;padding:40px;color:var(--text-secondary)">Failed to load bids.</div>`;
        }
    }

    //Place bid
    document.getElementById('placeBidBtn')?.addEventListener('click', async () => {
        const target_date = document.getElementById('bidTargetDate').value;
        const bid_amount = parseFloat(document.getElementById('bidAmount').value);
        const errorDiv = document.getElementById('bidError');
        const successDiv = document.getElementById('bidSuccess');

        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        if (!target_date || !bid_amount) {
            errorDiv.textContent = 'Please fill in both target date and bid amount.';
            errorDiv.style.display = 'block';
            return;
        }

        const btn = document.getElementById('placeBidBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Placing...';

        try {
            const res = await fetch('/api/bidding', {
                method: 'POST', headers, body: JSON.stringify({ target_date, bid_amount })
            });
            const data = await res.json();

            if (res.ok) {
                successDiv.textContent = data.message || 'Bid placed!';
                successDiv.style.display = 'block';
                document.getElementById('bidTargetDate').value = '';
                document.getElementById('bidAmount').value = '';
                loadAll();
            } else {
                errorDiv.textContent = data.error || 'Failed to place bid.';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Network error.';
            errorDiv.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-lightning"></i> Place Blind Bid';
        }
    });

    //Update bid
    document.getElementById('updateBidBtn')?.addEventListener('click', async () => {
        const bidId = document.getElementById('updateBidBtn').dataset.bidId;
        const newAmount = parseFloat(document.getElementById('newBidAmount').value);

        if (!newAmount) return showToast('Enter new amount');

        try {
            const res = await fetch(`/api/bidding/${bidId}`, {
                method: 'PUT', headers, body: JSON.stringify({ bid_amount: newAmount })
            });
            const data = await res.json();

            if (res.ok) {
                showToast('Bid updated!');
                document.getElementById('updateBidModal').style.display = 'none';
                loadAll();
            } else {
                showToast(data.error || 'Update failed');
            }
        } catch (err) { showToast('Network error'); }
    });

    //Modal close handlers
    document.getElementById('closeUpdateModal')?.addEventListener('click', () => {
        document.getElementById('updateBidModal').style.display = 'none';
    });
    document.getElementById('updateBidModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
    document.getElementById('closeBidStatusModal')?.addEventListener('click', () => {
        document.getElementById('bidStatusModal').style.display = 'none';
    });
    document.getElementById('bidStatusModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });

    //Load everything
    function loadAll() {
        loadBids();
        loadMonthlyStatus();
        loadTomorrowSlot();
    }

    loadAll();
});
