import { Sequelize } from 'sequelize';

export const up = async (queryInterface) => {
  await queryInterface.createTable('Users', {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: Sequelize.DataTypes.STRING(100),
      allowNull: false
    },
    dob: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: false
    },
    address: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: false
    },
    createdAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.DataTypes.NOW
    },
    updatedAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.DataTypes.NOW
    },
    isdoctor: {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false
    }
  });

  await queryInterface.addIndex('Users', ['email']);
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('Users');
};
