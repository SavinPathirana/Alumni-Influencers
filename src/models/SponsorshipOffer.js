const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const SponsorshipOffer = sequelize.define('SponsorshipOffer', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        sponsor_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'The alumni user receiving the offer'
        },
        credential_type: {
            type: DataTypes.ENUM('Certification', 'Licence', 'ProfessionalCourse'),
            allowNull: false
        },
        credential_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'ID of the specific certification/licence/course being endorsed'
        },
        offer_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'used'),
            defaultValue: 'pending'
        }
    }, {
        tableName: 'sponsorship_offers',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return SponsorshipOffer;
};
