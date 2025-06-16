import { Sequelize } from 'sequelize';

export const up = async (queryInterface) => {
  await queryInterface.createTable('Submissions', {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patientName: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    aiSummary: {
      type: Sequelize.DataTypes.TEXT,
      allowNull: false
    },
    patientDob: {
      type: Sequelize.DataTypes.DATEONLY,
      allowNull: false
    },
    patientAddress: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false
    },
    patientId: {
      type: Sequelize.DataTypes.INTEGER,
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
    }

  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable('Submissions');
};
