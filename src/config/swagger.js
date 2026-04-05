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