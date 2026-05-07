import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import actionPlanRoutes from './routes/actionPlan.js';
import mockInterviewRoutes from './routes/mockInterview.js';
import readinessRoutes from './routes/readiness.js';
import leaderboardRoutes from './routes/leaderboard.js';
import careerCoachRoutes from './routes/careerCoach.js';

// Import error handling
import { errorHandler } from './utils/errorHandler.js';

dotenv.config();

const app = express();

// Security middleware - rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 login attempts per hour
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware - CORS with strict options
app.use(cors(corsOptions));

// Middleware - Security headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware - Body parsers with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/action-plan', actionPlanRoutes);
app.use('/api/mock-interview', mockInterviewRoutes);
app.use('/api/readiness-card', readinessRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/career-coach', careerCoachRoutes);

// Health check with dependency status
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    message: 'Kai Placement Copilot API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  };
  
  const statusCode = health.dependencies.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method
  });
});

// Global error handling middleware (must be last)
app.use(errorHandler);

// Connect to MongoDB
console.log('🔄 Connecting to MongoDB...');

let isDbConnected = false;

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    isDbConnected = true;
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database: kai_placement_copilot`);
    
    // Create indexes for performance
    createIndexes();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n⚠️  IMPORTANT: MongoDB connection failed!');
    console.log('   The server will start but database operations will fail.');
    console.log('   Please whitelist your IP in MongoDB Atlas:');
    console.log('   1. Go to https://cloud.mongodb.com');
    console.log('   2. Select your cluster → Network Access');
    console.log('   3. Add IP Address → Add Current IP Address');
    console.log('   4. Or add 0.0.0.0/0 (Allow from anywhere) for testing\n');
  });

// Create database indexes for performance
async function createIndexes() {
  try {
    const User = (await import('./models/User.js')).default;
    const ActionPlan = (await import('./models/ActionPlan.js')).default;
    const MockInterview = (await import('./models/MockInterview.js')).default;
    const ReadinessCard = (await import('./models/ReadinessCard.js')).default;
    const CareerCoachSession = (await import('./models/CareerCoachSession.js')).default;
    
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ readinessScore: -1 });
    await User.collection.createIndex({ college: 1 });
    await ActionPlan.collection.createIndex({ userId: 1 }, { unique: true });
    await MockInterview.collection.createIndex({ userId: 1 });
    await ReadinessCard.collection.createIndex({ userId: 1 }, { unique: true });
    await ReadinessCard.collection.createIndex({ shareLink: 1 }, { unique: true });
    await CareerCoachSession.collection.createIndex({ userId: 1 }, { unique: true });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️  Error creating indexes:', error.message);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Middleware to check DB connection
app.use((req, res, next) => {
  if (!isDbConnected && !req.path.includes('/health')) {
    return res.status(503).json({ 
      error: 'Database connection not available. Please try again later.',
      code: 'DB_UNAVAILABLE'
    });
  }
  next();
});

// Start server regardless of MongoDB connection
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log('\n💡 Next Steps:');
  console.log('   1. Ensure MongoDB Atlas IP is whitelisted');
  console.log('   2. Frontend will start on http://localhost:5173');
  console.log('   3. Run tests: cd server && node test-api.js\n');
});

export default app;
