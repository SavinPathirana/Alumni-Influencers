const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Certification = sequelize.define('Certification', {
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
        url: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        completion_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        }
    }, {
        tableName: 'certifications',
        timestamps: false,
        indexes: [
            { fields: ['completion_date'], name: 'idx_cert_date' },
            { fields: ['profile_id', 'completion_date'], name: 'idx_cert_profile_date' }
        ]
    });

    return Certification;
};
