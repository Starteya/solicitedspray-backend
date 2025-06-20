// backend/routes/aggregate.js

const express = require('express');
const router = express.Router();
const aggregateVideos = require('../jobs/aggregateVideos');
const Parameter = require('../models/Parameter');

router.post('/', async (req, res) => {
  console.log('Aggregate endpoint hit');
  const secret = req.headers['x-aggregate-secret'];

  if (secret !== process.env.AGGREGATE_SECRET) {

    return res.status(403).send('Forbidden.');

  }
    console.log('Running daily video aggregation...');
  try {
    // Get the current parameter from MongoDB
    let parameterDoc = await Parameter.findOne({}); // Find the first document in the collection
    if (!parameterDoc) {
      // If no document exists, create one
      parameterDoc = new Parameter({ parameter: 0 });
      await parameterDoc.save();
    }

    let parameter = parameterDoc.parameter;

    // Increment the parameter
    parameter += 75;
    await aggregateVideos(parameter);

    // Update the parameter in the database
    parameterDoc.parameter = parameter;
    await parameterDoc.save();

    res.status(200).send('Aggregation completed successfully.');
  } catch (error) {
    console.error('Error updating parameter:', error);
    res.status(500).send('Aggregation failed.');
  }
});


module.exports = router;