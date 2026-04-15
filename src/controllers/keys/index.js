const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ApiKey, ApiUsageLog, sequelize } = require('../../models');
const { fn, col, literal } = require('sequelize');

/**
 * @swagger
 * tags:
 *   name: API Keys
 *   description: Developer API key management (generate, list, revoke, usage statistics)
 */

//Controller Functions

const generateKey = async (req, res) => {
    try {
        const { client_name, permissions } = req.body;

        if (!client_name) {
            return res.status(400).json({ error: 'Client name is required.' });
        }

        // Validate permissions if provided
        const validScopes = ['read:alumni', 'read:analytics', 'read:alumni_of_day'];
        const keyPermissions = permissions || validScopes; // Default to all scopes

        const invalidScopes = keyPermissions.filter(s => !validScopes.includes(s));
        if (invalidScopes.length > 0) {
            return res.status(400).json({
                error: 'Invalid permission scopes.',
                invalid: invalidScopes,
                valid_scopes: validScopes
            });
        }

        //Generate a cryptographically secure API key
        const keyValue = crypto.randomBytes(32).toString('hex');

        const apiKey = await ApiKey.create({
            key_value: keyValue,
            client_name,
            permissions: keyPermissions
        });

        res.status(201).json({
            message: 'API key generated successfully. Store this key securely — it will not be shown again.',
            key_id: apiKey.id,
            api_key: keyValue,
            client_name: client_name,
            permissions: keyPermissions
        });

    } catch (error) {
        console.error('Generate Key Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const listKeys = async (req, res) => {
    try {
        const keys = await ApiKey.findAll({
            attributes: [
                'id',
                [fn('CONCAT', fn('LEFT', col('key_value'), 8), '...', fn('RIGHT', col('key_value'), 4)), 'key_preview'],
                'client_name', 'is_active', 'created_at', 'revoked_at'
            ],
            order: [['created_at', 'DESC']]
        });

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
        const key = await ApiKey.findOne({
            where: { id: keyId },
            attributes: [
                'id',
                [fn('CONCAT', fn('LEFT', col('key_value'), 8), '...', fn('RIGHT', col('key_value'), 4)), 'key_preview'],
                'client_name', 'is_active', 'created_at', 'revoked_at'
            ]
        });

        if (!key) {
            return res.status(404).json({ error: 'API key not found.' });
        }

        //Total request count
        const totalRequests = await ApiUsageLog.count({ where: { api_key_id: keyId } });

        //Last used timestamp
        const lastUsed = await ApiUsageLog.max('timestamp', { where: { api_key_id: keyId } });

        //Endpoint breakdown
        const endpointStats = await ApiUsageLog.findAll({
            where: { api_key_id: keyId },
            attributes: ['method', 'endpoint', [fn('COUNT', col('id')), 'hit_count']],
            group: ['method', 'endpoint'],
            order: [[literal('hit_count'), 'DESC']],
            limit: 20
        });

        //Recent requests
        const recentRequests = await ApiUsageLog.findAll({
            where: { api_key_id: keyId },
            attributes: ['method', 'endpoint', 'timestamp'],
            order: [['timestamp', 'DESC']],
            limit: 10
        });

        res.status(200).json({
            key,
            usage: {
                total_requests: totalRequests,
                last_used: lastUsed,
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

        const [updatedCount] = await ApiKey.update(
            { is_active: false, revoked_at: new Date() },
            { where: { id: keyId, is_active: true } }
        );

        if (updatedCount === 0) {
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
