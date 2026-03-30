const cron = require('node-cron');
const pool = require('../config/db');

//Midnight every day
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
                `SELECT id FROM bids 
                 WHERE target_date = ? AND status = 'pending' 
                 ORDER BY bid_amount DESC, created_at ASC`,
                [targetDate]
            );

            if (bids.length > 0) {
                const winningBidId = bids[0].id;
                //Get IDs of the losing bids
                const losingBidIds = bids.slice(1).map(b => b.id);

                //Update the winner
                await pool.query(`UPDATE bids SET status = 'won' WHERE id = ?`, [winningBidId]);

                //Update the losers
                if (losingBidIds.length > 0) {
                    const placeholders = losingBidIds.map(() => '?').join(',');
                    await pool.query(
                        `UPDATE bids SET status = 'lost' WHERE id IN (${placeholders})`, 
                        losingBidIds
                    );
                }
                
                console.log(`[CRON] Successfully resolved bids for date: ${targetDate}`);
            }
        }
    } catch (error) {
        console.error('[CRON] Error during bid resolution:', error);
    }
});

console.log('Automated background tasks initialized.');