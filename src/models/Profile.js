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
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        programme: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        graduation_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        industry_sector: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        location: {
            type: DataTypes.STRING(255),
            allowNull: true
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
