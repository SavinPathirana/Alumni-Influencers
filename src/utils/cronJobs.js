const cron = require('node-cron');
const pool = require('../config/db');

//Runs at midnight every day to resolve the daily bids
cron.schedule('0 0 * * *', async () => {
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

                    //Send mock limit notifications
                    losingBids.forEach(loser => {
                        console.log(`Mock Email: Sorry, your bid for ${targetDate} was outbid. Sent to: ${loser.email}`);
                    });
                }
                
                console.log(`[CRON] Resolved bids for ${targetDate}. Winner: user ${winningBid.user_id}`);
                console.log(`Mock Email: Congratulations! Your bid won the featured slot for ${targetDate}. Sent to: ${winningBid.email}`);
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