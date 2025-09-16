#!/bin/bash
# N0DE Development Environment Setup Script

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting N0DE Development Environment...${NC}"

# Check if we're already in tmux
if [ -n "$TMUX" ]; then
    echo -e "${YELLOW}Already in tmux session. Setting up panes...${NC}"

    # Rename current window
    tmux rename-window "backend"

    # Start backend in current pane
    echo -e "${GREEN}Starting backend server...${NC}"
    tmux send-keys "npm run dev:backend" C-m

    # Create new pane for frontend (split horizontally)
    tmux split-window -h
    tmux send-keys "cd frontend && npm run dev" C-m

    # Create new pane for monitoring (split vertically)
    tmux split-window -v
    tmux send-keys "npm run prisma:studio" C-m

    # Select the backend pane
    tmux select-pane -t 0

    echo -e "${GREEN}Development environment ready!${NC}"
    echo -e "Backend: http://localhost:4000"
    echo -e "Frontend: http://localhost:3000"
    echo -e "Prisma Studio: http://localhost:5555"
else
    # Create new tmux session
    echo -e "${GREEN}Creating new tmux session 'n0de-dev'...${NC}"

    tmux new-session -d -s n0de-dev -n backend

    # Backend pane
    tmux send-keys -t n0de-dev:backend "npm run dev:backend" C-m

    # Frontend pane
    tmux split-window -h -t n0de-dev:backend
    tmux send-keys -t n0de-dev:backend.1 "cd frontend && npm run dev" C-m

    # Monitoring pane
    tmux split-window -v -t n0de-dev:backend.1
    tmux send-keys -t n0de-dev:backend.2 "npm run prisma:studio" C-m

    # Attach to session
    tmux attach-session -t n0de-dev
fi