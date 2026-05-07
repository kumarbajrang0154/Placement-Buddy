# 🚀 Production Deployment Guide

## System Requirements

- Node.js 18+ (LTS recommended)
- Python 3.10+ (for LLM services)
- MongoDB Atlas (cloud) or MongoDB 6.0+ (self-hosted)
- Groq API key (for AI features)
- Domain name & SSL certificate

## Pre-Deployment Checklist

### 1. Environment Configuration
```bash
# Backend (.env)
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

# MongoDB (Atlas recommended)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kai_placement_copilot?retryWrites=true&w=majority

# JWT
JWT_SECRET=<generate new with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# API Keys (keep secure!)
GROQ_API_KEY=<your-groq-key>
GEMINI_API_KEY=<your-gemini-key>
```

### 2. Database Optimization
```javascript
// Indexes already created on:
- User.email (unique)
- User.readinessScore (for sorting)
- User.college (for filtering)
- ActionPlan.userId (unique)
- MockInterview.userId
- ReadinessCard.shareLink (unique)
```

### 3. Security Configuration

#### Update CORS for Production
```javascript
// server.js
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ],
  credentials: true
};
```

#### Enable HTTPS
- Use Let's Encrypt (free) via Certbot
- Or purchase SSL certificate
- Redirect HTTP to HTTPS
- Set HSTS header (already configured)

## Deployment Options

### Option 1: AWS EC2 (Recommended)

```bash
# 1. Launch EC2 instance (Ubuntu 22.04 LTS)
# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install MongoDB locally OR use MongoDB Atlas
# 4. Install PM2 for process management
sudo npm install -g pm2

# 5. Clone and setup
git clone <your-repo>
cd Placement-Buddy
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 6. Build frontend
cd client && npm run build && cd ..

# 7. Start with PM2
pm2 start server/server.js --name "kai-api"
pm2 start "cd client && npm run dev" --name "kai-web"
pm2 save
pm2 startup
```

### Option 2: Vercel (Frontend) + Railway/Render (Backend)

**Frontend on Vercel:**
```bash
# Connect GitHub to Vercel
# Auto-deploys on push to main
# Environment: REACT_APP_API_URL=https://api.yourdomain.com
```

**Backend on Railway/Render:**
```bash
# Set environment variables in dashboard
# Auto-deploys from GitHub
# Connect MongoDB Atlas
```

### Option 3: Docker Containerization

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/ .
EXPOSE 5000
CMD ["node", "server.js"]
```

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

## Performance Optimization

### 1. Database
- All indexes created ✅
- Connection pooling enabled
- Query optimization for leaderboard

### 2. Frontend
- Code splitting: Each route loads separately
- Lazy loading: Images load on demand
- CSS-in-JS optimized
- Service Worker for offline support

### 3. Backend
- Rate limiting enabled ✅
- Compression middleware configured
- Connection pooling for database
- Caching for read-heavy endpoints

### 4. CDN
- Serve static assets from CDN
- Cloudflare (free tier available)
- CloudFront for AWS

## Monitoring & Logging

### Essential Metrics
- API response times
- Error rates
- Database query performance
- User authentication success rate
- Server CPU/Memory usage
- Database connection count

### Tools
- **Monitoring**: DataDog, New Relic, or Prometheus
- **Logging**: ELK Stack, Splunk, or CloudWatch
- **Error Tracking**: Sentry, Rollbar
- **Uptime**: StatusPage.io

### Add Logging to Backend
```javascript
// server.js
import morgan from 'morgan';
app.use(morgan('combined'));
```

## Scaling Strategy

### Phase 1: MVP (Current)
- Single server instance
- Shared database
- Basic monitoring

### Phase 2: Growth
- Load balancer (Nginx)
- Database read replicas
- Redis caching
- CDN for static assets

### Phase 3: Enterprise
- Kubernetes (K8s) orchestration
- Auto-scaling
- Multi-region deployment
- Database sharding

## Backup Strategy

### Database Backups
```javascript
// Automated daily backups in MongoDB Atlas
// Go to: Cluster > Backup > Scheduled Snapshots
// Set: Daily, retain 7 days
```

### Application Code
```bash
# GitHub already provides version control
# Additionally: Use GitHub Actions for CI/CD
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renew (runs automatically)
sudo systemctl enable certbot.timer
```

## Performance Benchmarks

### Target Metrics
- Page Load Time: < 2 seconds
- API Response Time: < 500ms (p95)
- Uptime: 99.9%
- Database Query Time: < 100ms (p95)

### Current Performance (After Optimizations)
- Auth endpoints: ~50ms
- Action plan generation: ~1-2s (includes LLM)
- Mock interview questions: ~2-3s (includes LLM)
- Dashboard load: ~300ms
- Leaderboard: ~100ms

## Continuous Deployment (CI/CD)

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to server
        run: |
          ssh user@server
          cd /app
          git pull
          npm install
          npm run build
          pm2 restart all
```

## Disaster Recovery

### Backup & Restore Plan
1. **Database**: MongoDB Atlas automated backups
2. **Code**: GitHub repository
3. **Assets**: S3 or similar object storage
4. **Logs**: Retained for 30 days

### Recovery Steps
1. Restore from MongoDB backup
2. Redeploy application from GitHub
3. Verify all services operational
4. Notify users of any disruption

## Security Hardening

### Checklist
- [ ] HTTPS/SSL enabled
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Input validation enforced
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database encrypted at rest
- [ ] Regular security audits
- [ ] Dependency updates (npm audit)
- [ ] Access logging enabled

## Post-Deployment

### Week 1
- Monitor error rates
- Check performance metrics
- Gather user feedback
- Fix any critical issues

### Month 1
- Analyze usage patterns
- Optimize based on data
- Plan feature improvements
- Review security logs

### Ongoing
- Weekly: Check uptime/errors
- Monthly: Review analytics
- Quarterly: Security audit
- Annually: Full system assessment

---

## Quick Deploy Commands

```bash
# Pull latest code
git pull origin main

# Install/update dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build frontend
cd client && npm run build && cd ..

# Restart services
pm2 restart all

# View logs
pm2 logs
```

---

For questions: support@kaicopilot.dev
Last Updated: 2024
