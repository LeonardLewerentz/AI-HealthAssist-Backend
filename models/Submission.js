import { DataTypes, Model } from 'sequelize';

const createSubmissionModel = (sequelize) => {
  class Submission extends Model {}
  Submission.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    patientName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aiSummary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    patientDob: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isBefore: new Date().toISOString().split('T')[0]
      }
    },
    patientAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Submission',
    timestamps: true,
  });

  return Submission;
};

export default createSubmissionModel;
