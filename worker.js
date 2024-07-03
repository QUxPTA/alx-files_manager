const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const express = require('express');
const DBClient = require('./utils/db');
const app = express();

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const fileDocument = await DBClient.db
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });

  if (!fileDocument) {
    throw new Error('File not found');
  }

  const filePath = fileDocument.localPath;
  const fileBuffer = await fs.promises.readFile(filePath);

  const thumbnails = await Promise.all([
    imageThumbnail(fileBuffer, { width: 500 }),
    imageThumbnail(fileBuffer, { width: 250 }),
    imageThumbnail(fileBuffer, { width: 100 })
  ]);

  const thumbnailPaths = thumbnails.map((thumbnail, index) => {
    const width = [500, 250, 100][index];
    const thumbnailPath = `${filePath}_${width}`;
    fs.promises.writeFile(thumbnailPath, thumbnail);
    return thumbnailPath;
  });

  console.log(
    `Thumbnails generated for file ${fileId}: ${thumbnailPaths.join(', ')}`
  );
});

app.listen(5000, () => {
  console.log('Worker server listening on port 5000');
});
