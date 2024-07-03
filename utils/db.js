const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    // Initialize MongoDB client with environment variables or default values
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const uri = `mongodb://${host}:${port}`;

    // Create a MongoDB client
    this.client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Connect to the database
    this.client
      .connect()
      .then(() => {
        this.db = this.client.db(database);
        console.log('Connected successfully to MongoDB');
      })
      .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
      });
  }

  // Function to check if the connection to MongoDB is alive
  isAlive() {
    return this.client.isConnected();
  }

  // Asynchronous function to get the number of users in the collection
  async nbUsers() {
    const usersCollection = this.db.collection('users');
    const usersCount = await usersCollection.countDocuments();
    return usersCount;
  }

  // Asynchronous function to get the number of files in the collection
  async nbFiles() {
    const filesCollection = this.db.collection('files');
    const filesCount = await filesCollection.countDocuments();
    return filesCount;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
