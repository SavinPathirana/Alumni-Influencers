/**
 * Wallet Page JS — Displays wallet balance and sponsorship backing
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
    const nav = document.getElementById('nav-wallet');
    if (nav) nav.classList.add('active');

    async function loadWallet() {
        try {
            const res = await fetch('/api/wallet', { headers });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            document.getElementById('walletBalance').textContent = `£${data.wallet_balance.toFixed(2)}`;
            document.getElementById('sponsorshipBacking').textContent = `£${data.sponsorship_backing.toFixed(2)}`;
            document.getElementById('pendingReservation').textContent = `£${data.pending_bid_reservation.toFixed(2)}`;
            document.getElementById('totalAvailable').textContent = `£${data.total_available.toFixed(2)}`;
            document.getElementById('acceptedCount').textContent = data.accepted_offers;
            document.getElementById('pendingCount').textContent = data.pending_offers;
            document.getElementById('usedCount').textContent = data.used_offers || 0;

        } catch (error) {
            console.error('Wallet load error:', error);
            document.getElementById('walletBalance').textContent = 'Error';
            document.getElementById('sponsorshipBacking').textContent = 'Error';
            document.getElementById('pendingReservation').textContent = 'Error';
            document.getElementById('totalAvailable').textContent = 'Error';
        }
    }

    loadWallet();
})();
