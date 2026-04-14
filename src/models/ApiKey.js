const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ApiKey = sequelize.define('ApiKey', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        key_value: {
            type: DataTypes.STRING(64),
            unique: true,
            allowNull: false
        },
        client_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        revoked_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        permissions: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '["read:alumni","read:analytics","read:alumni_of_day"]',
            get() {
                const raw = this.getDataValue('permissions');
                return raw ? JSON.parse(raw) : [];
            },
            set(val) {
                this.setDataValue('permissions', JSON.stringify(val));
            }
        }
    }, {
        tableName: 'api_keys',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    return ApiKey;
};
