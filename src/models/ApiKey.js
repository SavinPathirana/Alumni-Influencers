const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ApiKey = sequelize.define('ApiKey', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        key_value: {
            type: DataTypes.STRING(64),
            unique: true,
            allowNull: false
        },
        client_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        revoked_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'api_keys',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return ApiKey;
};
