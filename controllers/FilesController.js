import { v4 as uuidv4 } from 'uuid';
import RedisClient from '../utils/redis';
import DBClient from '../utils/db';

const { ObjectId } = require('mongodb');
const fs = require('fs');
const mime = require('mime-types');
const Bull = require('bull');

class FilesController {
  // Handles file upload
  static async postUpload(request, response) {
    const fileQueue = new Bull('fileQueue');

    // Get the token from the request header
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    // Check if the token exists in Redis
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken)
      return response.status(401).send({ error: 'Unauthorized' });

    // Find the user associated with the token
    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Validate file name
    const fileName = request.body.name;
    if (!fileName) return response.status(400).send({ error: 'Missing name' });

    // Validate file type
    const fileType = request.body.type;
    if (!fileType || !['folder', 'file', 'image'].includes(fileType))
      return response.status(400).send({ error: 'Missing type' });

    // Validate file data for files and images
    const fileData = request.body.data;
    if (!fileData && ['file', 'image'].includes(fileType))
      return response.status(400).send({ error: 'Missing data' });

    const fileIsPublic = request.body.isPublic || false;
    let fileParentId = request.body.parentId || 0;
    fileParentId = fileParentId === '0' ? 0 : fileParentId;

    // Check if parent file exists and is a folder
    if (fileParentId !== 0) {
      const parentFile = await DBClient.db
        .collection('files')
        .findOne({ _id: ObjectId(fileParentId) });
      if (!parentFile)
        return response.status(400).send({ error: 'Parent not found' });
      if (!['folder'].includes(parentFile.type))
        return response.status(400).send({ error: 'Parent is not a folder' });
    }

    // Prepare file data for database insertion
    const fileDataDb = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: fileParentId,
    };

    // Handle folder type separately
    if (['folder'].includes(fileType)) {
      await DBClient.db.collection('files').insertOne(fileDataDb);
      return response.status(201).send({
        id: fileDataDb._id,
        userId: fileDataDb.userId,
        name: fileDataDb.name,
        type: fileDataDb.type,
        isPublic: fileDataDb.isPublic,
        parentId: fileDataDb.parentId,
      });
    }

    // Generate file path and save the file
    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileUuid = uuidv4();
    const buff = Buffer.from(fileData, 'base64');
    const pathFile = `${pathDir}/${fileUuid}`;

    await fs.mkdir(pathDir, { recursive: true }, (error) => {
      if (error) return response.status(400).send({ error: error.message });
      return true;
    });

    await fs.writeFile(pathFile, buff, (error) => {
      if (error) return response.status(400).send({ error: error.message });
      return true;
    });

    // Save local file path in the database
    fileDataDb.localPath = pathFile;
    await DBClient.db.collection('files').insertOne(fileDataDb);

    // Add a job to the file processing queue
    fileQueue.add({
      userId: fileDataDb.userId,
      fileId: fileDataDb._id,
    });

    return response.status(201).send({
      id: fileDataDb._id,
      userId: fileDataDb.userId,
      name: fileDataDb.name,
      type: fileDataDb.type,
      isPublic: fileDataDb.isPublic,
      parentId: fileDataDb.parentId,
    });
  }

  // Get details of a specific file
  static async getShow(request, response) {
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken)
      return response.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';
    const fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return response.status(404).send({ error: 'Not found' });

    return response.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // Get a list of files for a user
  static async getIndex(request, response) {
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken)
      return response.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const parentId = request.query.parentId || 0;
    const pagination = request.query.page || 0;

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0)
      aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await DBClient.db
      .collection('files')
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return response.send(filesArray);
  }

  // Publish a file
  static async putPublish(request, response) {
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken)
      return response.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';

    let fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return response.status(404).send({ error: 'Not found' });

    await DBClient.db
      .collection('files')
      .update({ _id: ObjectId(idFile) }, { $set: { isPublic: true } });
    fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return response.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // Unpublish a file
  static async putUnpublish(request, response) {
    const token = request.header('X-Token') || null;
    if (!token) return response.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken)
      return response.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    const idFile = request.params.id || '';

    let fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return response.status(404).send({ error: 'Not found' });

    await DBClient.db
      .collection('files')
      .update(
        { _id: ObjectId(idFile), userId: user._id },
        { $set: { isPublic: false } }
      );
    fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return response.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // Get the content of a file
  static async getFile(request, response) {
    const idFile = request.params.id || '';
    const size = request.query.size || 0;

    const fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile) });
    if (!fileDocument) return response.status(404).send({ error: 'Not found' });

    const { isPublic } = fileDocument;
    const { userId } = fileDocument;
    const { type } = fileDocument;

    let user = null;
    let owner = false;

    // Check if the request is from the file owner
    const token = request.header('X-Token') || null;
    if (token) {
      const redisToken = await RedisClient.get(`auth_${token}`);
      if (redisToken) {
        user = await DBClient.db
          .collection('users')
          .findOne({ _id: ObjectId(redisToken) });
        if (user) owner = user._id.toString() === userId.toString();
      }
    }

    // If file is not public and user is not the owner, return 404
    if (!isPublic && !owner)
      return response.status(404).send({ error: 'Not found' });

    // Check if the requested file is a folder
    if (['folder'].includes(type))
      return response
        .status(400)
        .send({ error: "A folder doesn't have content" });

    // Construct the file path based on the requested size
    const realPath =
      size === 0 ? fileDocument.localPath : `${fileDocument.localPath}_${size}`;

    try {
      // Read and return the file content
      const dataFile = fs.readFileSync(realPath);
      const mimeType = mime.contentType(fileDocument.name);
      response.setHeader('Content-Type', mimeType);
      return response.send(dataFile);
    } catch (error) {
      return response.status(404).send({ error: 'Not found' });
    }
  }
}

module.exports = FilesController;
