const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(255),
            unique: true,
            allowNull: false
        },
        password_hash: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        verification_token: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        reset_token: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        reset_token_expiry: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return User;
};
