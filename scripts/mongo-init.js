// MongoDB initialization script
// This runs automatically when the container is first created

db = db.getSiblingDB('bandpulse');

// Create application user
db.createUser({
    user: 'bandpulse_app',
    pwd: 'dev_password',
    roles: [{ role: 'readWrite', db: 'bandpulse' }]
});

// Colección users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ location: "2dsphere" });
db.users.createIndex({ oauthId: 1, oauthProvider: 1 });

// Colección artists
db.artists.createIndex({ slug: 1 }, { unique: true });
db.artists.createIndex({ name: "text" });
db.artists.createIndex({ "externalIds.spotify": 1 }, { sparse: true });
db.artists.createIndex({ "externalIds.bandsintown": 1 }, { sparse: true });
db.artists.createIndex({ lastFetchedAt: 1 });

// Colección events
db.events.createIndex({ artistId: 1 });
db.events.createIndex({ date: 1 });
db.events.createIndex({ "venue.location": "2dsphere" });
db.events.createIndex({ artistId: 1, date: 1 });
db.events.createIndex({ externalId: 1, dataSource: 1 }, { unique: true, sparse: true });
db.events.createIndex({ status: 1 });

// Colección follows
db.follows.createIndex({ userId: 1, artistId: 1 }, { unique: true });
db.follows.createIndex({ artistId: 1 });
db.follows.createIndex({ userId: 1 });

// Colección notifications
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, eventId: 1, type: 1 }, { unique: true, sparse: true });

print('✅ BandPulse database initialized successfully');
print('✅ User bandpulse_app created');
print('✅ All indexes created');
