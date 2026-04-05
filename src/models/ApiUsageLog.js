const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ApiUsageLog = sequelize.define('ApiUsageLog', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        api_key_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        endpoint: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        method: {
            type: DataTypes.STRING(10),
            allowNull: false
        }
    }, {
        tableName: 'api_usage_logs',
        timestamps: true,
        createdAt: 'timestamp',
        updatedAt: false
    });

    return ApiUsageLog;
};
