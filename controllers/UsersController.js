const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const UserController = {
  async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Retrieve user from MongoDB
      const user = await dbClient.db
        .collection('users')
        .findOne({ _id: userId });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Return user details (email and id)
      res.status(200).json({
        id: user._id,
        email: user.email,
      });
    } catch (error) {
      console.error(`Error in getMe: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

module.exports = UserController;
