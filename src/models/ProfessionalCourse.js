const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProfessionalCourse = sequelize.define('ProfessionalCourse', {
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
        tableName: 'professional_courses',
        timestamps: false
    });

    return ProfessionalCourse;
};
