import sha1 from 'sha1';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

const { ObjectId } = require('mongodb');

class UsersController {
  /**
   * POST /users
   * Creates a new user in the database.
   * Request body must include 'email' and 'password'.
   */
  static async postNew (request, response) {
    // Get email from request body
    const userEmail = request.body.email;
    if (!userEmail) { return response.status(400).send({ error: 'Missing email' }); }

    // Get password from request body
    const userPassword = request.body.password;
    if (!userPassword) { return response.status(400).send({ error: 'Missing password' }); }

    // Check if the user already exists
    const oldUserEmail = await DBClient.db
      .collection('users')
      .findOne({ email: userEmail });
    if (oldUserEmail) { return response.status(400).send({ error: 'Already exist' }); }

    // Hash the password using SHA1
    const shaUserPassword = sha1(userPassword);

    // Insert the new user into the database
    const result = await DBClient.db
      .collection('users')
      .insertOne({ email: userEmail, password: shaUserPassword });

    // Return the new user ID and email
    return response
      .status(201)
      .send({ id: result.insertedId, email: userEmail });
  }

  /**
   * GET /users/me
   * Retrieves the authenticated user's information based on the provided token.
   * Token must be included in the 'X-Token' header.
   */
  static async getMe (request, response) {
    // Get the token from the request header
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    // Retrieve the user ID associated with the token from Redis
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) { return response.status(401).send({ error: 'Unauthorized' }); }

    // Find the user in the database by their ID
    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Remove the password field before returning the user data
    delete user.password;

    // Return the user ID and email
    return response.status(200).send({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
