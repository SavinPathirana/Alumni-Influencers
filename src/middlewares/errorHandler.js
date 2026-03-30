const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);

    //500 Internal Server Error if a status code isn't set
    const statusCode = err.statusCode || 500;
    
    //Provides a consistent JSON structure for all errors
    res.status(statusCode).json({
        error: {
            message: err.message || 'An unexpected error occurred on the server.',
            //Only show the stack trace if running in development mode
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};

module.exports = errorHandler;