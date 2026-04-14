const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Employment = sequelize.define('Employment', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        profile_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        company: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        role: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        industry_sector: {
            type: DataTypes.STRING(100),
            allowNull: true
        }
    }, {
        tableName: 'employment_history',
        timestamps: false
    });

    return Employment;
};
