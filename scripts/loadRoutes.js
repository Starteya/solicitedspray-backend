// backend/scripts/loadRoutes.js

require('dotenv').config();
const mongoose = require('mongoose');
const Route = require('../models/Route');
const fs = require('fs')
const path = require('path')


const loadRoutes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    // Clear existing routes
    await Route.deleteMany();

    
    const dataDir = path.join(__dirname, '../../backend/data');
    const files = fs.readdirSync(dataDir);

      
    for (const file of files) {
        if(file.endsWith('json')) {
            const countryName = file.replace('.json', ""); // uses filename as country name
            const data = require(`../../backend/data/${file}`);
            
            const routesArray = [];
            for (const [cragName, cragData] of Object.entries(data)) {
                const { area, location, routes } = cragData;

                for (const route of routes) {
                routesArray.push({
                    name: route.name,
                    grade: route.grade,
                    sector: route.sector,
                    yds: route.YDS,
                    crag: cragName,
                    area,
                    location,
                    country: countryName,
                });
      }
    }
        
    // Insert routes into database
    if (routesArray.length > 0){
        await Route.insertMany(routesArray);
        console.log('Routes loaded successfully');
    }
  }
}
console.log('All routes loaded successfully');
process.exit(0);
} catch (error) {
    console.error('Error loading routes:', error);
    process.exit(1);
    }
};


loadRoutes();