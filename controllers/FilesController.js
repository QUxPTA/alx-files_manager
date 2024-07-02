const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dbClient = require('../utils/db');

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  async postUpload (req, res) {
    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    const { token } = req.headers;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - Token missing' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type or invalid type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

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
        const fileData = Buffer.from(data, 'base64');
        const fileExtension = path.extname(name);
        const fileName = uuidv4() + fileExtension;
        localPath = path.join(FOLDER_PATH, fileName);

        await fs.promises.mkdir(FOLDER_PATH, { recursive: true });

        await fs.promises.writeFile(localPath, fileData);
      }

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

  async getShow (req, res) {
    const { token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - Token missing' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const file = await dbClient.db
      .collection('files')
      .findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(file);
  }

  async getIndex (req, res) {
    const { token } = req.headers;
    const { parentId = 0, page = 0 } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - Token missing' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    const files = await dbClient.db
      .collection('files')
      .aggregate([
        { $match: { userId, parentId } },
        { $skip: page * 20 },
        { $limit: 20 }
      ])
      .toArray();

    return res.json(files);
  }
}

module.exports = new FilesController();
