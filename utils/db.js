import { MongoClient } from 'mongodb';

// Retrieve MongoDB connection details from environment variables or use default values
const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || 27017;
const DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${HOST}:${PORT}`;

class DBClient {
  constructor () {
    // Create a new MongoClient instance with the specified options
    this.client = new MongoClient(url, {
      useUnifiedTopology: true, // Ensure compatibility with MongoDB driver
      useNewUrlParser: true // Use new URL string parser
    });

    // Connect to the MongoDB server
    this.client
      .connect()
      .then(() => {
        // Set the database reference once the connection is successful
        this.db = this.client.db(DATABASE);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  /**
   * Checks if the connection to MongoDB is alive.
   * @returns {boolean} True if connected, false otherwise.
   */
  isAlive () {
    return this.client.isConnected();
  }

  /**
   * Gets the number of documents in the 'users' collection.
   * @returns {Promise<number>} The number of user documents.
   */
  async nbUsers () {
    const users = this.db.collection('users');
    const usersNum = await users.countDocuments();
    return usersNum;
  }

  /**
   * Gets the number of documents in the 'files' collection.
   * @returns {Promise<number>} The number of file documents.
   */
  async nbFiles () {
    const files = this.db.collection('files');
    const filesNum = await files.countDocuments();
    return filesNum;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
