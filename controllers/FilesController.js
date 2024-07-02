const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const FilesController = {
  async postUpload (req, res) {
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    const { token } = req.headers;

    // Verify token
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - Token missing' });
    }

    // Retrieve user from Redis using token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type or invalid type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Check parentId validity
    if (parentId !== 0) {
      const parentFile = await dbClient.db
        .collection('files')
        .findOne({ _id: parentId });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    try {
      let localPath = '';

      if (type !== 'folder') {
        // Decode Base64 data and save locally
        const fileData = Buffer.from(data, 'base64');
        const fileExtension = path.extname(name);
        const fileName = uuidv4() + fileExtension;
        localPath = path.join(FOLDER_PATH, fileName);

        // Ensure directory exists
        await fs.promises.mkdir(FOLDER_PATH, { recursive: true });

        // Write file to local storage
        await fs.promises.writeFile(localPath, fileData);
      }

      // Save file details to MongoDB
      const newFile = {
        userId,
        name,
        type,
        parentId,
        isPublic,
        localPath: type !== 'folder' ? localPath : undefined,
        created_at: new Date()
      };

      const result = await dbClient.db.collection('files').insertOne(newFile);
      const savedFile = { ...newFile, _id: result.insertedId };

      res.status(201).json(savedFile);
    } catch (error) {
      console.error(`Error in postUpload: ${error.message}`);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = FilesController;
