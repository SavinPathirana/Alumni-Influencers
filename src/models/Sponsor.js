const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Sponsor = sequelize.define('Sponsor', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        logo_url: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        contact_email: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        total_budget: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'The sponsor user account that manages this organization'
        }
    }, {
        tableName: 'sponsors',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return Sponsor;
};
