const { getRedisClient } = require('../services/redisClient');

function registerLocationSocketHandlers(io) {
  const redis = getRedisClient();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Driver location update
    socket.on('driver:location:update', async (data) => {
      try {
        const { driverId, latitude, longitude, heading } = data;
        
        // Store in Redis for quick retrieval
        await redis.hset(
          `driver:location:${driverId}`,
          'latitude', latitude,
          'longitude', longitude,
          'heading', heading,
          'timestamp', Date.now()
        );

        // Broadcast to nearby riders (in real app, implement geofencing)
        io.emit('driver:location:updated', {
          driverId,
          latitude,
          longitude,
          heading,
        });
      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    // Rider location tracking
    socket.on('rider:location:track', async (data) => {
      try {
        const { rideId, latitude, longitude } = data;
        
        await redis.hset(
          `ride:location:${rideId}`,
          'latitude', latitude,
          'longitude', longitude,
          'timestamp', Date.now()
        );

        io.emit('ride:location:updated', { rideId, latitude, longitude });
      } catch (err) {
        console.error('Ride tracking error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = { registerLocationSocketHandlers };
