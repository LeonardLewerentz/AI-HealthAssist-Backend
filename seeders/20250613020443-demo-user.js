// seeders/your-timestamp-demo-users.mjs

import bcrypt from 'bcrypt';
import createUserModel from '../models/User.js'; // Adjust path if necessary

export default {
  up: async (queryInterface, Sequelize) => {
    // You'll need to get the sequelize instance to create the model
    // This is a common pattern for seeding with a factory function model.
    // However, for seeding, it's often simpler to directly use queryInterface.bulkInsert
    // as it bypasses model hooks (like beforeCreate for password hashing)
    // which you'll handle manually here for clarity.

    // If you want to use the model's hooks (like password hashing via beforeCreate),
    // you would typically need access to the Sequelize instance used by your app.
    // For simplicity and direct control, we'll hash passwords here and use bulkInsert.

    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('securepass', 10);
    const hashedPassword3 = await bcrypt.hash('mysecretpwd', 10);

    return queryInterface.bulkInsert('Users', [
      {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: hashedPassword1,
        dob: '1990-05-15',
        address: '123 Main St, Anytown',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: hashedPassword2,
        dob: '1985-11-20',
        address: '456 Oak Ave, Somewhere',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Alice Johnson',
        email: 'alice.j@example.com',
        password: hashedPassword3,
        dob: '1992-07-01',
        address: '789 Pine Ln, Nowhere',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    // This removes all entries from the 'Users' table.
    // You can refine this to delete only the specific seeded users if needed,
    // e.g., by filtering by email.
    return queryInterface.bulkDelete('Users', null, {});
  }
};

