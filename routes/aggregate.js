// backend/routes/aggregate.js

const express = require('express');
const router = express.Router();
const aggregateVideos = require('../jobs/aggregateVideos');
const Parameter = require('../models/Parameter');

router.post('/', async (req, res) => {
  const secret = req.headers['x-aggregate-secret'];

  if (secret !== process.env.AGGREGATE_SECRET) {

    return res.status(403).send('Forbidden.');

  }
    res.status(200).send('Aggregation started.'); // Send 
    console.log('Running daily video aggregation...');
   try {
    let parameterDoc = await Parameter.findOne({});
    if (!parameterDoc) {
      parameterDoc = new Parameter({ parameter: 0 });
      await parameterDoc.save();
    }

    const offset = parameterDoc.parameter;
    const BATCH_SIZE = 100;

    const result = await aggregateVideos(offset, BATCH_SIZE); // 👈 pass both offset and limit

    // If we processed fewer than BATCH_SIZE, reset (end of dataset)
    if (result.processed < BATCH_SIZE) {
      console.log('Reached end of route list. Resetting offset.');
      parameterDoc.parameter = 0;
    } else {
      parameterDoc.parameter += BATCH_SIZE;
    }

    await parameterDoc.save();
  } catch (error) {
    console.error('Error updating parameter:', error);
    res.status(500).send('Aggregation failed.');
  }
});


module.exports = router;