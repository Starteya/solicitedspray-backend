// backend/routes/server.js
require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const allowedOrigins = process.env.NODE_ENV === 'production' ? [
  'https://solicitedspray.com',
  'https://www.solicitedspray.com',
  'https://solicitedspray.web.app',
  'https://solicitedspray.firebaseapp.com',
] : [

  'http://localhost:3000',
  'http://localhost:5000'
];


app.use(cors({

  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {

      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';

      return callback(new Error(msg), false);

    }

    return callback(null, true);

  },

  credentials: true,

}));

app.use(express.json({limit: '10kb'}));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import routes
const routeRoutes = require('./routes');
const contactRoutes = require('./contact');
const aggregateRoutes = require('./aggregate'); 

// Use routes
app.use('/api/routes', routeRoutes);

// Use the contact route
app.use('/api/contact', contactRoutes);

app.use('/api/aggregate', aggregateRoutes);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Scheduled video aggregation - FOR LOCAL DEVELOPMENT ONLY
/*const cron = require('node-cron');
const aggregateVideos = require('../jobs/aggregateVideos');
const Parameter = require('../models/Parameter');


// Schedule the aggregation to run every day at midnight
cron.schedule('0 0 * * *', async () => {
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
    parameter += 25;
  aggregateVideos(parameter);
        
        // Update the parameter in the database
    parameterDoc.parameter = parameter;
    await parameterDoc.save();
  } catch (error) {
    console.error('Error updating parameter:', error);
  }
});
*/
