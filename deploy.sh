#!/bin/bash

# MiniMax AI Platform Deployment Script
# This script deploys the AI platform to a Linux server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="minimax-ai-platform"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

setup_environment() {
    log_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        log_info "Creating .env file from example..."
        cp .env.example "$ENV_FILE"
        
        # Generate secure secrets
        JWT_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        
        # Update .env file with generated secrets
        sed -i "s/your-super-secret-jwt-key-change-in-production/$JWT_SECRET/g" "$ENV_FILE"
        sed -i "s/your-session-secret-change-in-production/$SESSION_SECRET/g" "$ENV_FILE"
        
        log_warning "Please edit $ENV_FILE and add your OpenRouter API key"
        log_warning "You can get it from: https://openrouter.ai/"
    fi
}

build_and_deploy() {
    log_info "Building and deploying application..."
    
    # Create necessary directories
    mkdir -p backend/logs backend/uploads
    mkdir -p frontend/dist
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down || true
    
    # Build and start services
    log_info "Building and starting services..."
    docker-compose up --build -d
    
    log_success "Application deployed successfully!"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for database
    log_info "Waiting for PostgreSQL..."
    timeout=60
    while ! docker-compose exec -T postgres pg_isready -U minimax_user -d minimax_ai_platform; do
        sleep 2
        timeout=$((timeout-2))
        if [ $timeout -le 0 ]; then
            log_error "Database failed to start"
            exit 1
        fi
    done
    log_success "PostgreSQL is ready"
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    timeout=30
    while ! docker-compose exec -T redis redis-cli ping; do
        sleep 1
        timeout=$((timeout-1))
        if [ $timeout -le 0 ]; then
            log_error "Redis failed to start"
            exit 1
        fi
    done
    log_success "Redis is ready"
    
    # Wait for backend
    log_info "Waiting for backend API..."
    timeout=60
    while ! curl -f http://localhost:5000/health; do
        sleep 2
        timeout=$((timeout-2))
        if [ $timeout -le 0 ]; then
            log_error "Backend API failed to start"
            exit 1
        fi
    done
    log_success "Backend API is ready"
    
    # Wait for frontend
    log_info "Waiting for frontend..."
    timeout=30
    while ! curl -f http://localhost:3000; do
        sleep 1
        timeout=$((timeout-1))
        if [ $timeout -le 0 ]; then
            log_error "Frontend failed to start"
            exit 1
        fi
    done
    log_success "Frontend is ready"
}

show_status() {
    log_info "Application Status:"
    docker-compose ps
    
    echo ""
    log_success "🎉 MiniMax AI Platform is now running!"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔌 Backend API: http://localhost:5000"
    echo "🗄️  Database: localhost:5432"
    echo "💾 Redis: localhost:6379"
    echo ""
    echo "📊 Monitoring (optional):"
    echo "   - Prometheus: http://localhost:9090"
    echo "   - Grafana: http://localhost:3001 (admin/admin)"
    echo ""
    echo "📝 Useful commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart services: docker-compose restart"
    echo "   - Update: ./deploy.sh"
    echo ""
}

# Main deployment process
main() {
    log_info "🚀 Starting MiniMax AI Platform deployment..."
    
    check_dependencies
    setup_environment
    build_and_deploy
    wait_for_services
    show_status
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "stop")
        log_info "Stopping MiniMax AI Platform..."
        docker-compose down
        log_success "Services stopped"
        ;;
    "restart")
        log_info "Restarting MiniMax AI Platform..."
        docker-compose restart
        log_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "status")
        docker-compose ps
        ;;
    "clean")
        log_warning "This will remove all containers, volumes, and data!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v --remove-orphans
            docker system prune -af
            log_success "Cleanup completed"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|stop|restart|logs|status|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Deploy the application (default)"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show logs (optional service name)"
        echo "  status  - Show service status"
        echo "  clean   - Remove all containers and data"
        exit 1
        ;;
esac