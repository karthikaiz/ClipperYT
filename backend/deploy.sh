#!/bin/bash

# YouTube Shorts Clipper Backend Deployment Script

set -e  # Exit on any error

echo "🚀 YouTube Shorts Clipper Backend Deployment"
echo "============================================="

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    echo "   cd backend && ./deploy.sh"
    exit 1
fi

# Function to display help
show_help() {
    echo "Usage: ./deploy.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  local     Setup for local development"
    echo "  docker    Build and run Docker container"
    echo "  heroku    Deploy to Heroku"
    echo "  vercel    Deploy to Vercel"
    echo "  pm2       Setup for production with PM2"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh local"
    echo "  ./deploy.sh docker"
    echo "  ./deploy.sh heroku"
}

# Function for local development setup
setup_local() {
    echo "🔧 Setting up local development environment..."
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
    
    # Download FFmpeg
    echo "⬇️ Downloading FFmpeg.wasm..."
    npm run build
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "📝 Creating .env file..."
        cat > .env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=chrome-extension://your-extension-id,http://localhost:3000

# Rate Limiting
RATE_LIMIT_POINTS=10
RATE_LIMIT_DURATION=60

# Job Settings
JOB_CLEANUP_INTERVAL=3600000
JOB_TTL=86400000
EOF
        echo "✅ .env file created. Please update ALLOWED_ORIGINS with your extension ID."
    fi
    
    echo "✅ Local setup complete!"
    echo "🎯 Run 'npm run dev' to start the development server"
}

# Function for Docker deployment
setup_docker() {
    echo "🐳 Building Docker container..."
    
    # Create Dockerfile if it doesn't exist
    if [ ! -f "Dockerfile" ]; then
        echo "📝 Creating Dockerfile..."
        cat > Dockerfile << EOF
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Download FFmpeg
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF
    fi
    
    # Build Docker image
    echo "🔨 Building Docker image..."
    docker build -t youtube-shorts-clipper-backend .
    
    # Run Docker container
    echo "🚀 Starting Docker container..."
    docker run -d \
        --name youtube-clipper-backend \
        -p 3001:3001 \
        -e NODE_ENV=production \
        youtube-shorts-clipper-backend
    
    echo "✅ Docker deployment complete!"
    echo "🎯 Backend running at http://localhost:3001"
    echo "🔍 Check status: docker logs youtube-clipper-backend"
}

# Function for Heroku deployment
setup_heroku() {
    echo "🟣 Setting up Heroku deployment..."
    
    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        echo "❌ Heroku CLI not found. Please install it first:"
        echo "   https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Create Procfile
    if [ ! -f "Procfile" ]; then
        echo "📝 Creating Procfile..."
        echo "web: npm start" > Procfile
    fi
    
    # Login to Heroku (if not already logged in)
    echo "🔑 Checking Heroku authentication..."
    heroku auth:whoami || heroku login
    
    # Create Heroku app
    echo "🏗️ Creating Heroku app..."
    read -p "Enter your Heroku app name: " APP_NAME
    heroku create $APP_NAME
    
    # Set environment variables
    echo "⚙️ Setting environment variables..."
    heroku config:set NODE_ENV=production
    heroku config:set NPM_CONFIG_PRODUCTION=false
    
    # Deploy to Heroku
    echo "🚀 Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku"
    git push heroku main
    
    echo "✅ Heroku deployment complete!"
    echo "🎯 Backend URL: https://$APP_NAME.herokuapp.com"
}

# Function for Vercel deployment
setup_vercel() {
    echo "▲ Setting up Vercel deployment..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "📦 Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Create vercel.json
    if [ ! -f "vercel.json" ]; then
        echo "📝 Creating vercel.json..."
        cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
EOF
    fi
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    echo "✅ Vercel deployment complete!"
}

# Function for PM2 production setup
setup_pm2() {
    echo "⚡ Setting up PM2 production deployment..."
    
    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    # Install dependencies
    echo "📦 Installing production dependencies..."
    npm ci --only=production
    
    # Download FFmpeg
    echo "⬇️ Downloading FFmpeg.wasm..."
    npm run build
    
    # Create PM2 ecosystem file
    if [ ! -f "ecosystem.config.js" ]; then
        echo "📝 Creating PM2 ecosystem file..."
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'youtube-shorts-clipper-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
        
        # Create logs directory
        mkdir -p logs
    fi
    
    # Start with PM2
    echo "🚀 Starting application with PM2..."
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    echo "⚙️ Setting up PM2 startup script..."
    pm2 startup
    
    echo "✅ PM2 deployment complete!"
    echo "🎯 Backend running with PM2"
    echo "🔍 Monitor: pm2 monit"
    echo "📊 Status: pm2 status"
}

# Main script logic
case "${1:-help}" in
    local)
        setup_local
        ;;
    docker)
        setup_docker
        ;;
    heroku)
        setup_heroku
        ;;
    vercel)
        setup_vercel
        ;;
    pm2)
        setup_pm2
        ;;
    help)
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo "📚 Check backend/README.md for more detailed instructions" 