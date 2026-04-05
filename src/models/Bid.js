const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Bid = sequelize.define('Bid', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        target_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        bid_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'won', 'lost'),
            defaultValue: 'pending'
        }
    }, {
        tableName: 'bids',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return Bid;
};
