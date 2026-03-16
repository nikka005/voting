#!/bin/bash
# =========================================
# Glowing Star - AWS Auto Setup Script
# Run this on a fresh Ubuntu 22.04 EC2 instance
# =========================================

set -e

echo "🌟 Starting Glowing Star Installation..."
echo "========================================="

# Variables - CHANGE THESE
GITHUB_REPO="https://github.com/nikka005/voting.git"
DOMAIN_PUBLIC="glowingstar.vote"
DOMAIN_PORTAL="glowingstar.net"
YOUR_EMAIL="your-email@example.com"  # For SSL certificate notifications

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Step 1: Update System
echo ""
echo "📦 Step 1: Updating system..."
sudo apt update && sudo apt upgrade -y
print_status "System updated"

# Step 2: Install Node.js 18
echo ""
echo "📦 Step 2: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn pm2
print_status "Node.js $(node --version) installed"

# Step 3: Install Python 3.11
echo ""
echo "📦 Step 3: Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3-pip
print_status "Python $(python3.11 --version) installed"

# Step 4: Install MongoDB 7.0
echo ""
echo "📦 Step 4: Installing MongoDB 7.0..."
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
print_status "MongoDB 7.0 installed and running"

# Step 5: Install Nginx
echo ""
echo "📦 Step 5: Installing Nginx..."
sudo apt install -y nginx
print_status "Nginx installed"

# Step 6: Clone Repository
echo ""
echo "📦 Step 6: Cloning repository..."
cd /home/ubuntu
git clone $GITHUB_REPO voting
cd voting
print_status "Repository cloned"

# Step 7: Setup Backend
echo ""
echo "📦 Step 7: Setting up backend..."
cd /home/ubuntu/voting/backend

python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Generate secure JWT secret
JWT_SECRET=$(openssl rand -hex 32)

cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=glowingstar_production
JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
CORS_ORIGINS=https://$DOMAIN_PUBLIC,https://$DOMAIN_PORTAL,https://www.$DOMAIN_PUBLIC,https://www.$DOMAIN_PORTAL
STRIPE_API_KEY=sk_test_your_stripe_key_here
SENDGRID_API_KEY=your_sendgrid_key_here
EOF

print_status "Backend configured"

# Step 8: Setup Frontend
echo ""
echo "📦 Step 8: Setting up frontend..."
cd /home/ubuntu/voting/frontend

yarn install

cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN_PUBLIC
EOF

yarn build
print_status "Frontend built"

# Step 9: Setup PM2
echo ""
echo "📦 Step 9: Configuring PM2..."
cd /home/ubuntu/voting

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'glowingstar-backend',
    cwd: '/home/ubuntu/voting/backend',
    script: 'venv/bin/uvicorn',
    args: 'server:app --host 0.0.0.0 --port 8001',
    interpreter: 'none',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
print_status "PM2 configured"

# Step 10: Configure Nginx (HTTP only first)
echo ""
echo "📦 Step 10: Configuring Nginx..."

sudo tee /etc/nginx/sites-available/$DOMAIN_PUBLIC << EOF
server {
    listen 80;
    server_name $DOMAIN_PUBLIC www.$DOMAIN_PUBLIC;
    
    root /home/ubuntu/voting/frontend/build;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}
EOF

sudo tee /etc/nginx/sites-available/$DOMAIN_PORTAL << EOF
server {
    listen 80;
    server_name $DOMAIN_PORTAL www.$DOMAIN_PORTAL;
    
    root /home/ubuntu/voting/frontend/build;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    location /ws/ {
        proxy_pass http://127.0.0.1:8001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN_PUBLIC /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/$DOMAIN_PORTAL /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl restart nginx
print_status "Nginx configured"

# Step 11: Install SSL (Certbot)
echo ""
echo "📦 Step 11: Installing SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

print_warning "After DNS is configured, run these commands to get SSL:"
echo "  sudo certbot --nginx -d $DOMAIN_PUBLIC -d www.$DOMAIN_PUBLIC --email $YOUR_EMAIL --agree-tos"
echo "  sudo certbot --nginx -d $DOMAIN_PORTAL -d www.$DOMAIN_PORTAL --email $YOUR_EMAIL --agree-tos"

# Step 12: Seed Initial Data
echo ""
echo "📦 Step 12: Seeding initial data..."
sleep 3
curl -s -X POST http://localhost:8001/api/seed/admin > /dev/null
curl -s -X POST http://localhost:8001/api/seed/contestants > /dev/null
print_status "Initial data seeded"

# Step 13: Configure Firewall
echo ""
echo "📦 Step 13: Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
print_status "Firewall configured"

# Done!
echo ""
echo "========================================="
echo "🎉 Installation Complete!"
echo "========================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure DNS records:"
echo "   - Point $DOMAIN_PUBLIC → $(curl -s ifconfig.me)"
echo "   - Point $DOMAIN_PORTAL → $(curl -s ifconfig.me)"
echo ""
echo "2. After DNS propagates, install SSL:"
echo "   sudo certbot --nginx -d $DOMAIN_PUBLIC -d www.$DOMAIN_PUBLIC"
echo "   sudo certbot --nginx -d $DOMAIN_PORTAL -d www.$DOMAIN_PORTAL"
echo ""
echo "3. Update API keys in /home/ubuntu/voting/backend/.env:"
echo "   - STRIPE_API_KEY"
echo "   - SENDGRID_API_KEY"
echo ""
echo "4. Admin Login:"
echo "   URL: https://$DOMAIN_PORTAL/portal/login"
echo "   Email: admin@glowingstar.net"
echo "   Password: admin123"
echo ""
echo "========================================="
