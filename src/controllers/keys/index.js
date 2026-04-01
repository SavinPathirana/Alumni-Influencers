const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../../config/db');

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: Developer API key management (generate, list, revoke, usage statistics)
 */

//Controller Functions

const generateKey = async (req, res) => {
    try {
        const { client_name } = req.body;

        if (!client_name) {
            return res.status(400).json({ error: 'Client name is required.' });
        }

        //Generate a cryptographically secure API key
        const keyValue = crypto.randomBytes(32).toString('hex');

        const [result] = await pool.query(
            'INSERT INTO api_keys (key_value, client_name) VALUES (?, ?)',
            [keyValue, client_name]
        );

        res.status(201).json({
            message: 'API key generated successfully. Store this key securely — it will not be shown again.',
            key_id: result.insertId,
            api_key: keyValue,
            client_name: client_name
        });

    } catch (error) {
        console.error('Generate Key Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const listKeys = async (req, res) => {
    try {
        const [keys] = await pool.query(
            `SELECT id, 
                    CONCAT(LEFT(key_value, 8), '...', RIGHT(key_value, 4)) as key_preview, 
                    client_name, is_active, created_at, revoked_at 
             FROM api_keys 
             ORDER BY created_at DESC`
        );

        res.status(200).json({ api_keys: keys });

    } catch (error) {
        console.error('List Keys Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getKeyStats = async (req, res) => {
    try {
        const keyId = req.params.id;

        //Get key details
        const [keys] = await pool.query(
            `SELECT id, CONCAT(LEFT(key_value, 8), '...', RIGHT(key_value, 4)) as key_preview, 
                    client_name, is_active, created_at, revoked_at 
             FROM api_keys WHERE id = ?`,
            [keyId]
        );

        if (keys.length === 0) {
            return res.status(404).json({ error: 'API key not found.' });
        }

        //Total request count
        const [totalCount] = await pool.query(
            'SELECT COUNT(*) as total FROM api_usage_logs WHERE api_key_id = ?',
            [keyId]
        );

        //Last used timestamp
        const [lastUsed] = await pool.query(
            'SELECT MAX(timestamp) as last_used FROM api_usage_logs WHERE api_key_id = ?',
            [keyId]
        );

        //Endpoint breakdown 
        const [endpointStats] = await pool.query(
            `SELECT method, endpoint, COUNT(*) as hit_count 
             FROM api_usage_logs 
             WHERE api_key_id = ? 
             GROUP BY method, endpoint 
             ORDER BY hit_count DESC 
             LIMIT 20`,
            [keyId]
        );

        //Recent requests
        const [recentRequests] = await pool.query(
            `SELECT method, endpoint, timestamp 
             FROM api_usage_logs 
             WHERE api_key_id = ? 
             ORDER BY timestamp DESC 
             LIMIT 10`,
            [keyId]
        );

        res.status(200).json({
            key: keys[0],
            usage: {
                total_requests: totalCount[0].total,
                last_used: lastUsed[0].last_used,
                endpoint_breakdown: endpointStats,
                recent_requests: recentRequests
            }
        });

    } catch (error) {
        console.error('Key Stats Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const revokeKey = async (req, res) => {
    try {
        const keyId = req.params.id;

        const [result] = await pool.query(
            'UPDATE api_keys SET is_active = FALSE, revoked_at = NOW() WHERE id = ? AND is_active = TRUE',
            [keyId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'API key not found or already revoked.' });
        }

        res.status(200).json({ message: 'API key revoked successfully.' });

    } catch (error) {
        console.error('Revoke Key Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

/**
 * @swagger
 * /api/keys:
 *   post:
 *     summary: Generate a new API key for a client application
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [client_name]
 *             properties:
 *               client_name:
 *                 type: string
 *                 example: ClientName
 *     responses:
 *       201:
 *         description: API key generated successfully
 *       400:
 *         description: Missing client name
 */
router.post('/', generateKey);

/**
 * @swagger
 * /api/keys:
 *   get:
 *     summary: List all API keys (masked) with their status
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 */
router.get('/', listKeys);

/**
 * @swagger
 * /api/keys/{id}/stats:
 *   get:
 *     summary: View usage statistics for an API key
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: API key ID
 *     responses:
 *       200:
 *         description: Usage statistics including request count, endpoints, and timestamps
 *       404:
 *         description: Key not found
 */
router.get('/:id/stats', getKeyStats);

/**
 * @swagger
 * /api/keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Key revoked successfully
 *       404:
 *         description: Key not found or already revoked
 */
router.delete('/:id', revokeKey);

module.exports = router;
