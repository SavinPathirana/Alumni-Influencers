/**
 * Sponsorships Page JS — Handles sponsorship offer management
 */
(function () {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    //Decode role from JWT
    let userRole = 'alumni';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userRole = payload.role || 'alumni';
    } catch (e) { }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    //Active sidebar link
    const nav = document.getElementById('nav-sponsorships');
    if (nav) nav.classList.add('active');

    //Load offers
    async function loadOffers() {
        try {
            const res = await fetch('/api/sponsorships/offers', { headers });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            const offers = data.offers || [];

            //Update stats
            const pending = offers.filter(o => o.status === 'pending').length;
            const accepted = offers.filter(o => o.status === 'accepted').length;
            const backing = offers
                .filter(o => o.status === 'accepted')
                .reduce((sum, o) => sum + parseFloat(o.offer_amount), 0);

            document.getElementById('pendingOffers').textContent = pending;
            document.getElementById('acceptedOffers').textContent = accepted;
            document.getElementById('totalBacking').textContent = `£${backing.toFixed(2)}`;

            //Render offers
            const container = document.getElementById('offersList');
            if (offers.length === 0) {
                container.innerHTML = `
                    <div class="content-section" style="text-align:center;padding:40px;">
                        <i class="bi bi-inbox" style="font-size:48px;color:var(--text-tertiary);"></i>
                        <p style="color:var(--text-secondary);margin-top:12px;">No sponsorship offers yet.</p>
                    </div>`;
                return;
            }

            container.innerHTML = offers.map(offer => {
                const sponsorName = offer.Sponsor ? offer.Sponsor.name : 'Unknown Sponsor';
                const statusColors = {
                    pending: 'var(--warning)',
                    accepted: 'var(--success)',
                    rejected: 'var(--error)'
                };

                let actions = '';
                if (offer.status === 'pending' && userRole === 'alumni') {
                    actions = `
                        <button class="btn btn-primary btn-accept-offer" data-offer-id="${offer.id}" style="font-size:13px;padding:6px 14px;">
                            <i class="bi bi-check-lg"></i> Accept
                        </button>
                        <button class="btn btn-reject-offer" data-offer-id="${offer.id}" style="font-size:13px;padding:6px 14px;background:var(--error);color:#fff;">
                            <i class="bi bi-x-lg"></i> Reject
                        </button>`;
                }

                return `
                    <div class="content-section" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                        <div>
                            <strong style="font-size:15px;">${sponsorName}</strong>
                            <span style="background:${statusColors[offer.status]};color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;margin-left:8px;font-weight:600;">${offer.status.toUpperCase()}</span>
                            <div style="color:var(--text-secondary);font-size:13px;margin-top:4px;">
                                ${offer.credential_type} #${offer.credential_id} · <strong>£${parseFloat(offer.offer_amount).toFixed(2)}</strong>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;">${actions}</div>
                    </div>`;
            }).join('');

        } catch (error) {
            console.error('Load offers error:', error);
            document.getElementById('offersList').innerHTML = `
                <div class="content-section alert alert-error">Failed to load offers: ${error.message}</div>`;
        }
    }

    //Event delegation for Accept and Reject buttons
    document.getElementById('offersList').addEventListener('click', async (e) => {
        const acceptBtn = e.target.closest('.btn-accept-offer');
        const rejectBtn = e.target.closest('.btn-reject-offer');

        if (acceptBtn) {
            const id = acceptBtn.dataset.offerId;
            acceptBtn.disabled = true;
            acceptBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Accepting...';

            try {
                const res = await fetch(`/api/sponsorships/offers/${id}/accept`, {
                    method: 'POST', headers
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                loadOffers();
            } catch (error) {
                alert('Error accepting offer: ' + error.message);
                acceptBtn.disabled = false;
                acceptBtn.innerHTML = '<i class="bi bi-check-lg"></i> Accept';
            }
        }

        if (rejectBtn) {
            if (!confirm('Are you sure you want to reject this offer?')) return;
            const id = rejectBtn.dataset.offerId;
            rejectBtn.disabled = true;
            rejectBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Rejecting...';

            try {
                const res = await fetch(`/api/sponsorships/offers/${id}/reject`, {
                    method: 'POST', headers
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                loadOffers();
            } catch (error) {
                alert('Error rejecting offer: ' + error.message);
                rejectBtn.disabled = false;
                rejectBtn.innerHTML = '<i class="bi bi-x-lg"></i> Reject';
            }
        }
    });

    //Init
    loadOffers();
})();
