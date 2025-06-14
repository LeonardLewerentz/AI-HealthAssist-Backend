// database.js
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv'; // Import dotenv here as well
dotenv.config(); // Ensure dotenv is configured in this file too if it's imported independently

console.log("Values used for Sequelize connection in database.js:");
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: true // Keep this true for debugging
  }
);

// Optional: Add a test connection here to see if it works
async function testDbConnection() {
  try {
    await sequelize.authenticate();
    console.log('Connection to database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Call the test function when database.js is imported
testDbConnection();

export default sequelize;
