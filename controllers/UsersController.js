const crypto = require('crypto');
const dbClient = require('../utils/db');

const UsersController = {
  async postNew(req, res) {
    const { email, password } = req.body;

    try {
      // Check if email and password are provided
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if email already exists in DB
      const existingUser = await dbClient.db
        .collection('users')
        .findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exists' });
      }

      // Hash the password using crypto module (SHA-256)
      const hashedPassword = crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');

      // Create the new user object
      const newUser = {
        email,
        password: hashedPassword, // Store hashed password
      };

      // Save the new user in the database
      const result = await dbClient.db.collection('users').insertOne(newUser);

      // Return the newly created user
      res.status(201).json({
        email: result.ops[0].email,
        id: result.insertedId,
      });
    } catch (error) {
      console.error(`Error in postNew: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = UsersController;
