const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Skill = sequelize.define('Skill', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        profile_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        skill_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        source: {
            type: DataTypes.ENUM('university', 'industry'),
            allowNull: false,
            defaultValue: 'industry'
        }
    }, {
        tableName: 'skills',
        timestamps: false
    });

    return Skill;
};
