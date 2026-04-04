const cron = require('node-cron');
const pool = require('../config/db');
const sendMail = require('./mailer');

//Runs at 6 PM every day to resolve the daily bids
cron.schedule('00 18 * * *', async () => {
    console.log('[CRON] Starting daily blind bid resolution...');

    try {
        //Find all target dates that have pending bids and have passed
        const [datesToResolve] = await pool.query(
            `SELECT DISTINCT target_date 
             FROM bids 
             WHERE status = 'pending' AND target_date <= CURDATE()`
        );

        if (datesToResolve.length === 0) {
            console.log('[CRON] No pending bids to resolve today.');
            return;
        }

        //Loop through each date and resolve the winner
        for (let row of datesToResolve) {
            const targetDate = row.target_date;

            //Get bids for the specific date, highest amount first
            const [bids] = await pool.query(
                `SELECT b.id, b.user_id, u.email FROM bids b 
                 JOIN users u ON b.user_id = u.id
                 WHERE b.target_date = ? AND b.status = 'pending' 
                 ORDER BY b.bid_amount DESC, b.created_at ASC`,
                [targetDate]
            );

            if (bids.length > 0) {
                const winningBid = bids[0];
                const losingBids = bids.slice(1);
                //Get IDs of the losing bids
                const losingBidIds = losingBids.map(b => b.id);

                //Update the winner
                await pool.query(`UPDATE bids SET status = 'won' WHERE id = ?`, [winningBid.id]);

                //Increment the winner's monthly appearance count
                await pool.query(
                    'UPDATE profiles SET monthly_appearance_count = monthly_appearance_count + 1 WHERE user_id = ?',
                    [winningBid.user_id]
                );

                //Update the losers
                if (losingBidIds.length > 0) {
                    const placeholders = losingBidIds.map(() => '?').join(',');
                    await pool.query(
                        `UPDATE bids SET status = 'lost' WHERE id IN (${placeholders})`,
                        losingBidIds
                    );

                    losingBids.forEach(loser => {
                        sendMail(
                            loser.email,
                            'Bid Result - Alumni Influencers',
                            `Sorry, your bid for ${targetDate} was outbid.`,
                            `<h2>Bid Update</h2>
                             <p>Unfortunately, your bid for the featured slot on <strong>${targetDate}</strong> was outbid by another alumnus.</p>
                             <p>Better luck next time! You can place a new bid anytime.</p>`
                        ).catch(err => console.error(`Failed to email loser ${loser.email}:`, err.message));
                    });
                }

                console.log(`[CRON] Resolved bids for ${targetDate}. Winner: user ${winningBid.user_id}`);
                sendMail(
                    winningBid.email,
                    'Congratulations! You Won the Featured Slot - Alumni Influencers',
                    `Your bid won the featured slot for ${targetDate}!`,
                    `<h2>Congratulations!</h2>
                     <p>Your bid has won the featured alumni slot for <strong>${targetDate}</strong>.</p>
                     <p>Your profile will be showcased on the platform for the entire day!</p>`
                ).catch(err => console.error(`Failed to email winner ${winningBid.email}:`, err.message));
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
        await pool.query('UPDATE profiles SET monthly_appearance_count = 0, has_event_bonus = FALSE');
        console.log('[CRON] All monthly appearance counts and event bonuses have been reset.');
    } catch (error) {
        console.error('[CRON] Error during monthly reset:', error);
    }
});

console.log('Automated background tasks initialized.');