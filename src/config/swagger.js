const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Alumni Influencers API',
            version: '1.0.0',
            description: 'API documentation for the Phantasmagoria Alumni Influencers platform.',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-api-key',
                    description: 'Enter the AR Client API Key here'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        email: { type: 'string' },
                        password_hash: { type: 'string' },
                        is_verified: { type: 'boolean' },
                        role: { type: 'string', enum: ['alumni', 'sponsor', 'admin'] },
                        wallet_balance: { type: 'number' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                Profile: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        bio: { type: 'string' },
                        linkedin_url: { type: 'string' },
                        profile_image_url: { type: 'string' },
                        monthly_appearance_count: { type: 'integer' },
                        has_event_bonus: { type: 'boolean' }
                    }
                },
                Degree: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        profile_id: { type: 'integer' },
                        title: { type: 'string' },
                        official_url: { type: 'string' },
                        completion_date: { type: 'string', format: 'date' }
                    }
                },
                Certification: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        profile_id: { type: 'integer' },
                        title: { type: 'string' },
                        url: { type: 'string' },
                        completion_date: { type: 'string', format: 'date' }
                    }
                },
                Licence: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        profile_id: { type: 'integer' },
                        title: { type: 'string' },
                        url: { type: 'string' },
                        completion_date: { type: 'string', format: 'date' }
                    }
                },
                ProfessionalCourse: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        profile_id: { type: 'integer' },
                        title: { type: 'string' },
                        url: { type: 'string' },
                        completion_date: { type: 'string', format: 'date' }
                    }
                },
                Employment: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        profile_id: { type: 'integer' },
                        company: { type: 'string' },
                        role: { type: 'string' },
                        start_date: { type: 'string', format: 'date' },
                        end_date: { type: 'string', format: 'date' }
                    }
                },
                Bid: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        target_date: { type: 'string', format: 'date' },
                        bid_amount: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'won', 'lost'] },
                        sponsorship_used: { type: 'number' },
                        wallet_used: { type: 'number' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                ApiKey: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        key_value: { type: 'string' },
                        client_name: { type: 'string' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                        revoked_at: { type: 'string', format: 'date-time' }
                    }
                },
                ApiUsageLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        api_key_id: { type: 'integer' },
                        endpoint: { type: 'string' },
                        method: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' }
                    }
                },
                Sponsor: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        logo_url: { type: 'string' },
                        contact_email: { type: 'string' },
                        total_budget: { type: 'number' },
                        user_id: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                SponsorshipOffer: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        sponsor_id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        credential_type: { type: 'string', enum: ['Certification', 'Licence', 'ProfessionalCourse'] },
                        credential_id: { type: 'integer' },
                        offer_amount: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                }
            },
        },

        //Apply security to all routes
        security: [
            {
                bearerAuth: [],
                ApiKeyAuth: []
            }
        ],
    },
    //Swagger routes locations
    apis: ['./src/controllers/*/index.js', './src/app.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;