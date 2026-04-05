const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Profile = sequelize.define('Profile', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            unique: true,
            allowNull: false
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        linkedin_url: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        profile_image_url: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        monthly_appearance_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        has_event_bonus: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'profiles',
        timestamps: false
    });

    return Profile;
};
