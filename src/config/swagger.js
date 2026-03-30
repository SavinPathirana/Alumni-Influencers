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
        },
        
        //Apply the security to all routes 
        security: [
            { 
                bearerAuth: [] ,
                ApiKeyAuth: [] 
            }      
        ], 
    },
    //This tells Swagger where to look for the comments that document your routes
    apis: ['./src/routes/*.js', './src/app.js'], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;