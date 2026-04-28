const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false
    }
);

//Import Models
const User = require('./User')(sequelize);
const Profile = require('./Profile')(sequelize);
const Degree = require('./Degree')(sequelize);
const Certification = require('./Certification')(sequelize);
const Licence = require('./Licence')(sequelize);
const ProfessionalCourse = require('./ProfessionalCourse')(sequelize);
const Employment = require('./Employment')(sequelize);
const Bid = require('./Bid')(sequelize);
const ApiKey = require('./ApiKey')(sequelize);
const ApiUsageLog = require('./ApiUsageLog')(sequelize);
const Skill = require('./Skill')(sequelize);
const Sponsor = require('./Sponsor')(sequelize);
const SponsorshipOffer = require('./SponsorshipOffer')(sequelize);

//Define Associations
User.hasOne(Profile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

Profile.hasMany(Degree, { foreignKey: 'profile_id', onDelete: 'CASCADE' });
Degree.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Certification, { foreignKey: 'profile_id', onDelete: 'CASCADE' });
Certification.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Licence, { foreignKey: 'profile_id', onDelete: 'CASCADE' });
Licence.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(ProfessionalCourse, { foreignKey: 'profile_id', onDelete: 'CASCADE' });
ProfessionalCourse.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Employment, { foreignKey: 'profile_id', onDelete: 'CASCADE' });
Employment.belongsTo(Profile, { foreignKey: 'profile_id' });

Profile.hasMany(Skill, { foreignKey: 'profile_id', onDelete: 'CASCADE' });
Skill.belongsTo(Profile, { foreignKey: 'profile_id' });

User.hasMany(Bid, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Bid.belongsTo(User, { foreignKey: 'user_id' });

ApiKey.hasMany(ApiUsageLog, { foreignKey: 'api_key_id', onDelete: 'CASCADE' });
ApiUsageLog.belongsTo(ApiKey, { foreignKey: 'api_key_id' });

//Sponsorship Associations
User.hasOne(Sponsor, { foreignKey: 'user_id', as: 'SponsorOrg' });
Sponsor.belongsTo(User, { foreignKey: 'user_id' });

Sponsor.hasMany(SponsorshipOffer, { foreignKey: 'sponsor_id', onDelete: 'CASCADE' });
SponsorshipOffer.belongsTo(Sponsor, { foreignKey: 'sponsor_id' });

User.hasMany(SponsorshipOffer, { foreignKey: 'user_id', onDelete: 'CASCADE' });
SponsorshipOffer.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    sequelize,
    User,
    Profile,
    Degree,
    Certification,
    Licence,
    ProfessionalCourse,
    Employment,
    Bid,
    ApiKey,
    ApiUsageLog,
    Skill,
    Sponsor,
    SponsorshipOffer
};
