// models/User.mjs
import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';

const createUserModel = (sequelize) => {
  class User extends Model {
    static async hashPassword(password) {
      return bcrypt.hash(password, 10);
    }

    async validatePassword(password) {
      return bcrypt.compare(password, this.password);
    }
  }

  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 255]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [8, 100]
      }
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString().split('T')[0]
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isdoctor: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING(16),
      validate: {len: 16}
    },
    encryptionKey: {
      type: DataTypes.STRING(64),
      validate: {len: 64}
    }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await User.hashPassword(user.password);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await User.hashPassword(user.password);
        }
      }
    }
  });

  return User;
};

export default createUserModel;
