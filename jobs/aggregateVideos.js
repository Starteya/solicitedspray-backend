// backend/jobs/aggregateVideos.js


require('dotenv').config();
const mongoose = require('mongoose');
const Route = require('../models/Route');
const searchYouTubeVideos = require('../services/youtubeService');
const searchVimeoVideos = require('../services/vimeoService');
//const searchInstagramMedia = require('../services/instagramService');
const redisClient = require('../services/redisClient');


const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createYDSRegex = (grade) => {
  // Define the minimum grade that requires regex matching
  const MIN_GRADE_NUMBER = 10; // Corresponds to 5.10
    
    // Check if the grade contains a '+' for grades 5.7, 5.8, or 5.9
  const plusRegex = /^(5\.(1|2|3|4|5|6|7|8|9))(\+?)$/;
  const matchPlus = grade.match(plusRegex);
  
  if (matchPlus) {
    // Handle grades with a '+' for 5.7, 5.8, or 5.9 only
    const gradeNumber = parseInt(matchPlus[1].slice(2), 10); // 7, 8, or 9 from '5.7+', '5.8+', '5.9+'
    const exactMatchRegex = new RegExp(`\\b5\\.${gradeNumber}(?:\\+)?\\b`, 'i');
    return exactMatchRegex;
  }
    
    
  // Normalize grade if it contains a slash '/' ONLY WORKS FOR 5.11!!!
  if (grade.includes('/')) {
    const [primaryGrade, secondaryGrade] = grade.split('/');
      
      // Add the '5.' prefix to the secondary grade
    const formattedSecondaryGrade = `5.11${secondaryGrade}`;
    // Recursively create regex for both grades
    return new RegExp(`\\b(?:${createYDSRegex(primaryGrade).source}|${createYDSRegex(formattedSecondaryGrade).source})\\b`, 'i');
  }
    
    // Parse the grade into its components for 5.10 and up
  const match = grade.match(/^5\.(\d+)([a-d]?)$/i);
  if (!match) {
    console.error(`Invalid YDS grade format: "${grade}"`);
    return null; // Handle invalid formats as needed
  }

  const gradeNumber = parseInt(match[1], 10); // e.g., 10 from '5.10a'
  const gradeLetter = match[2].toLowerCase(); // 'a', 'b', 'c', 'd' or ''
  
  // For grades 5.10a to 5.15d
  if (!gradeLetter) {
    console.error(`Grade "${grade}" lacks a letter suffix. Expected format like "5.10a".`);
    return null; // Or handle as per requirements
  }

  const gradeBase = `(?:5\\.)?${gradeNumber}`; // Make '5.' optional

  // Define possible transitions based on the current letter
  const transitions = {
    'a': ['a', 'a/b'],
    'b': ['b', 'a/b', 'b/c'],
    'c': ['c', 'b/c', 'c/d'],
    'd': ['d', 'c/d']
  };

  const validTransitions = transitions[gradeLetter];
  if (!validTransitions) {
    console.error(`Invalid grade letter: "${gradeLetter}"`);
    return null; // Or handle as per requirements
  }

  // Construct regex patterns
  const patterns = validTransitions.map(trans => `${gradeBase}${trans}`);

  // Join patterns with alternation and enforce word boundaries
  const regexString = `\\b(?:${patterns.join('|')})\\b`;
  return new RegExp(regexString, 'i');
};

const createFrenchGradeRegex = (grade) => {
  // This regex will handle grades from 5a to 10b, including the optional '+' modifier
  const baseGradePattern = `([5-9]|10)[abc]`;  // Matches grades from 5a to 10b (e.g., 5a, 6b, 10b)
  const modifierPattern = '(\\+)?';  // Matches optional '+' modifier

  // Combine base grade and modifier in one regex
  const regexPattern = `^${baseGradePattern}${modifierPattern}$`;

  // Create the regex
  const regex = new RegExp(regexPattern, 'i');  // Case-insensitive match

  // This part ensures that we match both 5a <-> 5a+ and 5a+ <-> 5a
  // If grade is "5a" we need to also match "5a+" and vice versa
  const isGradePlus = grade.endsWith('+'); // Check if the grade ends with '+'
  if (isGradePlus) {
    const baseGrade = grade.slice(0, -1);  // Remove the '+' for matching
    return new RegExp(`^(${baseGrade}|${baseGrade}\\+)$`, 'i');
  } else {
    return regex;
  }
};

const aggregateVideos = async (offset = 0, batchsize = 100) => {
  try {
    console.log(`Processing routes from offset ${offset} to ${offset + batchSize}`);

    // Correctly limit the number of routes
    const routes = await Route.find().skip(offset).limit(batchSize); // See server.js for value stored in database
            
    
    if (routes.length === 0) {
      console.log('No more routes to process.');
      return { processed: 0 };
    }

    for (const route of routes) {
        // query uses route.name + yds to search ONLY USING YDS BUT WILL NEED TO ADJUST BASED UPON LOCATION?
      const query = `${route.name} ${route.yds}`;
        
      // Fetch videos from APIs with delay to avoid exceeding quota
      let youTubeVideos = [];
      let vimeoVideos = [];
      // let instagramVideos = [];

      try {
        youTubeVideos = await searchYouTubeVideos(query);
        // Wait for 1 second before the next API call
        await wait(1000);
      } catch (error) {
        console.error('YouTube API Error:', error.message);
        // Handle quotaExceeded error
        if (error.response && error.response.data.error.code === 403) {
          console.error('YouTube API quota exceeded. Skipping further YouTube API calls.');
          // Break out of the loop or handle accordingly
          break;
        }
      }

      try {
        vimeoVideos = await searchVimeoVideos(query);
        await wait(1000);
      } catch (error) {
        console.error('Vimeo API Error:', error.message);
      }

      // Combine and deduplicate videos
      const videos = [...youTubeVideos, ...vimeoVideos];
      const uniqueVideos = Array.from(new Map(videos.map((v) => [v.url, v])).values());
        const filteredVideos = uniqueVideos.filter((video) => {
            // convert all text to lowercase for case-insensitive comarison
            const title = (video.title || '').toLowerCase();
            const description = (video.description || '').toLowerCase();
            
            // No .trim() needed?
            const name = (route.name || '').toLowerCase();
            const crag = (route.crag || '').toLowerCase();
            const area = (route.area || '').toLowerCase();
            
            //Normalize grade
            const grade = (route.grade || '').toLowerCase();
            
            const yds = (route.yds || '').toLowerCase();

            // Create regex patterns for grades
            const frenchGradeRegex = createFrenchGradeRegex(grade);
            const ydsRegex = createYDSRegex(yds);
            
            //check for name match
            const hasName = name && (title.includes(name) || description.includes(name));
            //check if crag, area, grade, or yds is present in the description
            const hasCrag = crag && (title.includes(crag) || description.includes(crag));
            const hasArea = area && (title.includes(area) || description.includes(area));
            const hasCragOrArea = (hasCrag || hasArea);

            // Check for grade or YDS match using regex
            const hasGrade = frenchGradeRegex && (frenchGradeRegex.test(title) || frenchGradeRegex.test(description));
            const hasYDS = ydsRegex && (ydsRegex.test(title) || ydsRegex.test(description));
          
            const hasGradeOrYDS = (hasGrade || hasYDS);

            // Must have name and one othermatching route parameter
            const meetsCriteria = (hasName && (hasCragOrArea || hasGradeOrYDS));
       
            return meetsCriteria;

        });
      if (filteredVideos.length > 0) {
        // Update route with videos
        route.videos = filteredVideos;
        await route.save();
        console.log(`Updated route: ${route.name} with ${filteredVideos.length} videos.`);
      } else {
          route.videos = [];
          await route.save();
          console.log(`No videos found for route: ${route.name}.`);
        // Optionally, keep the route even if no videos are found
        // Remove route if no videos
        //await Route.deleteOne({ _id: route._id });
        //console.log(`Removed route: ${route.name} (no videos found).`);
      }

      // Wait before processing the next route
      await wait(2000); // Wait for 2 seconds
    }
    console.log('Aggregation Complete');
    return { processed: routes.length };
  } catch (error) {
    console.error('Error aggregating videos:', error);
    return { processed: 0 };
  }
};

// **Execute the function when the script is run directly**
if(require.main === module){
(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

    // Run the aggregation
    await aggregateVideos(0, 100); 

    // Close connections
    await mongoose.disconnect();
    if (redisClient && redisClient.quit) {
      await redisClient.quit();
    }
    console.log('Aggregation complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during aggregation:', error);
    process.exit(1);
  }
})();
}

module.exports = aggregateVideos;