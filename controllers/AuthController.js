const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

const AuthController = {
  async getConnect (req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(
      authHeader.split(' ')[1],
      'base64'
    ).toString('utf-8');
    const [email, password] = credentials.split(':');

    try {
      // Find user by email and hashed password (SHA-1)
      const hashedPassword = crypto
        .createHash('sha1')
        .update(password)
        .digest('hex');
      const user = await dbClient.db
        .collection('users')
        .findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate token and store in Redis
      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400); // Store for 24 hours (86400 seconds)

      res.status(200).json({ token });
    } catch (error) {
      console.error(`Error in getConnect: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  async getDisconnect (req, res) {
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

      await redisClient.del(key);
      res.status(204).send(); // No content
    } catch (error) {
      console.error(`Error in getDisconnect: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = AuthController;
