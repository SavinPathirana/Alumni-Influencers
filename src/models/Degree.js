const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Degree = sequelize.define('Degree', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        profile_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        official_url: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        completion_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        }
    }, {
        tableName: 'degrees',
        timestamps: false
    });

    return Degree;
};
