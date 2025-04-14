// services/redisClient.js

const { createClient } = require('redis');

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_USERNAME = process.env.REDIS_USERNAME;
const REDIS_TLS = process.env.REDIS_TLS === 'true';

console.log(REDIS_HOST, REDIS_PORT, REDIS_USERNAME);
const redisOptions = {
  socket: {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
  },
    username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
};

if (REDIS_TLS) {
  redisOptions.socket.tls = true;
}

const redisClient = createClient(redisOptions);

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis Cloud');
  } catch (err) {
    console.error('Could not connect to Redis Cloud', err);
  }
})();

module.exports = redisClient;