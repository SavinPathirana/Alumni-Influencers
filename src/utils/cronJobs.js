const cron = require('node-cron');
const { Bid, User, Profile, SponsorshipOffer, sequelize } = require('../models');
const { Op, literal } = require('sequelize');
const sendMail = require('./mailer');

//Runs at 6 PM every day to resolve the daily bids
cron.schedule('00 18 * * *', async () => {
    console.log('[CRON] Starting daily blind bid resolution...');

    try {
        //Find all target dates that have pending bids and have passed
        const datesToResolve = await Bid.findAll({
            where: {
                status: 'pending',
                target_date: { [Op.lte]: literal('DATE_ADD(CURDATE(), INTERVAL 1 DAY)') }
            },
            attributes: ['target_date'],
            group: ['target_date']
        });

        if (datesToResolve.length === 0) {
            console.log('[CRON] No pending bids to resolve today.');
            return;
        }

        //Loop through each date and resolve the winner
        for (let row of datesToResolve) {
            const targetDate = row.target_date;

            //Get bids for the specific date, highest amount first
            const bids = await Bid.findAll({
                where: { target_date: targetDate, status: 'pending' },
                include: [{ model: User, attributes: ['id', 'email', 'wallet_balance'] }],
                order: [['bid_amount', 'DESC'], ['created_at', 'ASC']]
            });

            if (bids.length > 0) {
                const winningBid = bids[0];
                const losingBids = bids.slice(1);
                const losingBidIds = losingBids.map(b => b.id);

                //Update the winner
                await winningBid.update({ status: 'won' });

                //Increment the winner's monthly appearance count
                await Profile.increment('monthly_appearance_count', {
                    by: 1,
                    where: { user_id: winningBid.user_id }
                });

                //Fund Deduction Logic
                const bidAmount = parseFloat(winningBid.bid_amount);
                const walletBalance = parseFloat(winningBid.User.wallet_balance) || 0;

                //Get all accepted sponsorship offers for this user
                const acceptedOffers = await SponsorshipOffer.findAll({
                    where: { user_id: winningBid.user_id, status: 'accepted' },
                    order: [['offer_amount', 'ASC']]
                });

                const sponsorshipTotal = acceptedOffers.reduce((sum, o) => sum + parseFloat(o.offer_amount), 0);

                //Calculate how much comes from sponsorships vs wallet
                const sponsorshipUsed = Math.min(sponsorshipTotal, bidAmount);
                const walletUsed = Math.max(0, bidAmount - sponsorshipUsed);

                //Deduct from wallet (only if bid exceeds sponsorship backing)
                if (walletUsed > 0) {
                    const newBalance = Math.max(0, walletBalance - walletUsed);
                    await User.update(
                        { wallet_balance: newBalance },
                        { where: { id: winningBid.user_id } }
                    );
                    console.log(`[CRON] Deducted £${walletUsed.toFixed(2)} from user ${winningBid.user_id} wallet (was £${walletBalance.toFixed(2)}, now £${newBalance.toFixed(2)})`);
                }

                //Mark sponsorship offers as 'used' (consume them up to the bid amount)
                if (sponsorshipUsed > 0) {
                    let remaining = sponsorshipUsed;
                    for (const offer of acceptedOffers) {
                        if (remaining <= 0) break;
                        const offerAmount = parseFloat(offer.offer_amount);
                        if (offerAmount <= remaining) {
                            //Fully consumed
                            await offer.update({ status: 'used' });
                            remaining -= offerAmount;
                        } else {
                            //Partially consumed — reduce the offer amount to the leftover
                            await offer.update({
                                offer_amount: offerAmount - remaining,
                            });
                            remaining = 0;
                        }
                    }
                    console.log(`[CRON] Consumed £${sponsorshipUsed.toFixed(2)} of sponsorship backing for user ${winningBid.user_id}`);
                }

                console.log(`[CRON] Bid £${bidAmount.toFixed(2)} resolved — Sponsorship used: £${sponsorshipUsed.toFixed(2)}, Wallet used: £${walletUsed.toFixed(2)}, Remaining backing: £${(sponsorshipTotal - sponsorshipUsed).toFixed(2)}`);

                //Update the losers
                if (losingBidIds.length > 0) {
                    await Bid.update(
                        { status: 'lost' },
                        { where: { id: { [Op.in]: losingBidIds } } }
                    );

                    losingBids.forEach(loser => {
                        sendMail(
                            loser.User.email,
                            'Bid Result - Alumni Influencers',
                            `Sorry, your bid for ${targetDate} was outbid.`,
                            `<h2>Bid Update</h2>
                             <p>Unfortunately, your bid for the featured slot on <strong>${targetDate}</strong> was outbid by another alumnus.</p>
                             <p>Better luck next time! You can place a new bid anytime.</p>`
                        ).catch(err => console.error(`Failed to email loser ${loser.User.email}:`, err.message));
                    });
                }

                console.log(`[CRON] Resolved bids for ${targetDate}. Winner: user ${winningBid.user_id}`);
                sendMail(
                    winningBid.User.email,
                    'Congratulations! You Won the Featured Slot - Alumni Influencers',
                    `Your bid won the featured slot for ${targetDate}!`,
                    `<h2>Congratulations!</h2>
                     <p>Your bid has won the featured alumni slot for <strong>${targetDate}</strong>.</p>
                     <p>Your profile will be showcased on the platform for the entire day!</p>`
                ).catch(err => console.error(`Failed to email winner ${winningBid.User.email}:`, err.message));
            }
        }
    } catch (error) {
        console.error('[CRON] Error during bid resolution:', error);
    }
});

//Runs at midnight on the 1st of every month to reset appearance counts
cron.schedule('0 0 1 * *', async () => {
    console.log('[CRON] Monthly reset: resetting appearance counts...');

    try {
        await Profile.update(
            { monthly_appearance_count: 0, has_event_bonus: false },
            { where: {} }
        );
        console.log('[CRON] All monthly appearance counts and event bonuses have been reset.');
    } catch (error) {
        console.error('[CRON] Error during monthly reset:', error);
    }
});

console.log('Automated background tasks initialized.');