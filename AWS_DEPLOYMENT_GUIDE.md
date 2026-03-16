# 🌟 Glowing Star - AWS Deployment Guide

## Complete Installation Guide for AWS Hosting

### Your Configuration
- **GitHub Repository**: https://github.com/nikka005/voting.git
- **Public Domain**: glowingstar.vote
- **Management Domain**: glowingstar.net

---

## 📋 Prerequisites

### 1. AWS Account
- AWS Account with billing enabled
- IAM user with appropriate permissions

### 2. Domain Configuration
- Domain registered (glowingstar.vote, glowingstar.net)
- Access to DNS settings

### 3. Required Software Downloads

| Software | Version | Download Link |
|----------|---------|---------------|
| Node.js | 18.x LTS | https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz |
| Python | 3.11+ | https://www.python.org/ftp/python/3.11.7/Python-3.11.7.tgz |
| MongoDB | 7.0 | https://www.mongodb.com/try/download/community |
| Nginx | Latest | https://nginx.org/en/download.html |
| PM2 | Latest | `npm install -g pm2` |
| Git | Latest | https://git-scm.com/downloads |

---

## 🚀 OPTION 1: AWS EC2 Deployment (Recommended)

### Step 1: Launch EC2 Instance

```bash
# Recommended Instance Type
- Instance: t3.medium (2 vCPU, 4GB RAM) or larger
- AMI: Ubuntu 22.04 LTS
- Storage: 30GB SSD minimum
- Security Group: Allow ports 22, 80, 443
```

### Step 2: Connect to EC2

```bash
# Download your .pem key file from AWS Console
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 3: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js
node --version  # Should show v18.x.x
npm --version

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install MongoDB 7.0
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Yarn
sudo npm install -g yarn

# Install Git
sudo apt install -y git
```

### Step 4: Clone Repository

```bash
# Clone your repository
cd /home/ubuntu
git clone https://github.com/nikka005/voting.git
cd voting
```

### Step 5: Setup Backend

```bash
# Navigate to backend
cd /home/ubuntu/voting/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=glowingstar_production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
CORS_ORIGINS=https://glowingstar.vote,https://glowingstar.net,https://www.glowingstar.vote,https://www.glowingstar.net
STRIPE_API_KEY=sk_live_your_stripe_live_key
SENDGRID_API_KEY=your_sendgrid_api_key
EOF

# Test backend
python -c "import server; print('Backend OK')"
```

### Step 6: Setup Frontend

```bash
# Navigate to frontend
cd /home/ubuntu/voting/frontend

# Install dependencies
yarn install

# Create production .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://glowingstar.vote
EOF

# Build for production
yarn build
```

### Step 7: Configure PM2 (Process Manager)

```bash
# Create PM2 ecosystem file
cat > /home/ubuntu/voting/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'glowingstar-backend',
      cwd: '/home/ubuntu/voting/backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF

# Start backend with PM2
cd /home/ubuntu/voting
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 8: Configure Nginx

```bash
# Create Nginx configuration for glowingstar.vote (Public Site)
sudo cat > /etc/nginx/sites-available/glowingstar.vote << 'EOF'
server {
    listen 80;
    server_name glowingstar.vote www.glowingstar.vote;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name glowingstar.vote www.glowingstar.vote;
    
    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/glowingstar.vote/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/glowingstar.vote/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    
    # Frontend (React build)
    root /home/ubuntu/voting/frontend/build;
    index index.html;
    
    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket proxy
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Create Nginx configuration for glowingstar.net (Management Portal)
sudo cat > /etc/nginx/sites-available/glowingstar.net << 'EOF'
server {
    listen 80;
    server_name glowingstar.net www.glowingstar.net;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name glowingstar.net www.glowingstar.net;
    
    ssl_certificate /etc/letsencrypt/live/glowingstar.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/glowingstar.net/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    root /home/ubuntu/voting/frontend/build;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable sites
sudo ln -s /etc/nginx/sites-available/glowingstar.vote /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/glowingstar.net /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

### Step 9: Install SSL Certificates (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d glowingstar.vote -d www.glowingstar.vote
sudo certbot --nginx -d glowingstar.net -d www.glowingstar.net

# Auto-renewal (already configured by Certbot)
sudo certbot renew --dry-run
```

### Step 10: Configure DNS (In Your Domain Registrar)

```
# For glowingstar.vote
Type: A
Name: @
Value: YOUR_EC2_PUBLIC_IP

Type: A
Name: www
Value: YOUR_EC2_PUBLIC_IP

# For glowingstar.net
Type: A
Name: @
Value: YOUR_EC2_PUBLIC_IP

Type: A
Name: www
Value: YOUR_EC2_PUBLIC_IP
```

### Step 11: Start Everything

```bash
# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
pm2 status

# Seed admin user
curl -X POST http://localhost:8001/api/seed/admin
curl -X POST http://localhost:8001/api/seed/contestants
```

---

## 🚀 OPTION 2: AWS Elastic Beanstalk (Easier)

### Step 1: Install EB CLI

```bash
pip install awsebcli
```

### Step 2: Initialize Elastic Beanstalk

```bash
cd /path/to/voting
eb init -p python-3.11 glowingstar-app --region us-east-1
```

### Step 3: Create Environment

```bash
eb create glowingstar-production --instance-type t3.medium
```

### Step 4: Set Environment Variables

```bash
eb setenv MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/glowingstar \
          JWT_SECRET=your-secret-key \
          STRIPE_API_KEY=sk_live_xxx
```

---

## 🚀 OPTION 3: AWS ECS with Docker (Production Scale)

### Dockerfile for Backend

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Dockerfile for Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 📦 Required Python Packages (requirements.txt)

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
motor==3.3.2
pymongo==4.6.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pydantic==2.5.3
stripe==7.12.0
sendgrid==6.11.0
websockets==12.0
python-dotenv==1.0.0
httpx==0.26.0
```

---

## 📦 Required Node.js Packages (package.json)

Your frontend already has these in package.json. Key dependencies:
- react: ^18.2.0
- react-router-dom: ^6.x
- axios: ^1.x
- tailwindcss: ^3.x
- lucide-react: ^0.x

---

## 🔐 Security Checklist

```bash
# 1. Change default JWT secret
# In backend/.env, use a strong random string:
JWT_SECRET=$(openssl rand -hex 32)

# 2. Configure AWS Security Group
# Only allow:
- Port 22 (SSH) - Your IP only
- Port 80 (HTTP) - 0.0.0.0/0
- Port 443 (HTTPS) - 0.0.0.0/0

# 3. Enable firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 4. Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 🔄 Deployment Script (Auto-Update)

```bash
# Create deployment script
cat > /home/ubuntu/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Glowing Star..."

cd /home/ubuntu/voting

# Pull latest code
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Update frontend
cd ../frontend
yarn install
yarn build

# Restart services
pm2 restart all
sudo systemctl reload nginx

echo "✅ Deployment complete!"
EOF

chmod +x /home/ubuntu/deploy.sh
```

---

## 📊 Monitoring Commands

```bash
# Check backend logs
pm2 logs glowingstar-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check MongoDB status
sudo systemctl status mongod

# Check server resources
htop
df -h
```

---

## 🆘 Troubleshooting

### Backend not starting
```bash
cd /home/ubuntu/voting/backend
source venv/bin/activate
python -c "import server"  # Check for import errors
uvicorn server:app --host 0.0.0.0 --port 8001  # Run manually
```

### MongoDB connection issues
```bash
sudo systemctl status mongod
sudo tail -f /var/log/mongodb/mongod.log
```

### Nginx errors
```bash
sudo nginx -t  # Test configuration
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues
```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

---

## 📞 Support URLs

| Service | URL |
|---------|-----|
| AWS Console | https://console.aws.amazon.com |
| MongoDB Atlas (Cloud DB option) | https://www.mongodb.com/atlas |
| Stripe Dashboard | https://dashboard.stripe.com |
| SendGrid | https://app.sendgrid.com |
| Let's Encrypt | https://letsencrypt.org |

---

## ✅ Post-Deployment Checklist

- [ ] Both domains accessible (glowingstar.vote, glowingstar.net)
- [ ] SSL certificates working (green padlock)
- [ ] Admin login working (/portal/login)
- [ ] Contestants page loading
- [ ] Voting flow working
- [ ] WebSocket real-time updates working
- [ ] Stripe payments configured
- [ ] Email notifications configured (SendGrid)
- [ ] MongoDB backup configured
- [ ] PM2 monitoring enabled

---

## 💡 Recommended AWS Architecture

```
                    ┌─────────────────┐
                    │   Route 53      │
                    │ (DNS Management)│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  CloudFront     │
                    │  (CDN + SSL)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   ALB (Load     │
                    │   Balancer)     │
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
    │   EC2 #1     │ │   EC2 #2     │ │   EC2 #3     │
    │  (Backend)   │ │  (Backend)   │ │  (Backend)   │
    └───────┬──────┘ └───────┬──────┘ └───────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │  MongoDB Atlas  │
                    │   (Database)    │
                    └─────────────────┘
```

---

**Your Glowing Star platform is ready for production! 🌟**
