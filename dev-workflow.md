# N0DE Development Workflow with Neovim + Claude CLI

## Recommended tmux/screen Layout

```bash
# Session 1: Main Development
tmux new-session -d -s n0de-dev

# Window 0: Neovim Editor
tmux new-window -t n0de-dev:0 -n 'nvim'
tmux send-keys -t n0de-dev:0 'cd /home/sol/n0de-deploy && nvim' C-m

# Window 1: Claude CLI
tmux new-window -t n0de-dev:1 -n 'claude'
tmux send-keys -t n0de-dev:1 'cd /home/sol/n0de-deploy && claude chat' C-m

# Window 2: Backend Logs
tmux new-window -t n0de-dev:2 -n 'backend'
tmux send-keys -t n0de-dev:2 'pm2 logs n0de-backend --lines 50' C-m

# Window 3: Frontend Dev
tmux new-window -t n0de-dev:3 -n 'frontend'
tmux send-keys -t n0de-dev:3 'cd /home/sol/n0de-deploy/frontend && npm run dev' C-m

# Window 4: Database/Redis Monitor
tmux new-window -t n0de-dev:4 -n 'db'
tmux split-window -h
tmux send-keys -t n0de-dev:4.0 'watch -n 5 "redis-cli info | grep connected"' C-m
tmux send-keys -t n0de-dev:4.1 'PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost' C-m

# Attach to session
tmux attach-session -t n0de-dev
```

## Quick Commands

### Development
```bash
# Start development environment
./start-dev.sh

# Build and deploy frontend
cd frontend && npm run build && vercel --prod

# Restart backend
pm2 restart n0de-backend

# View logs
pm2 logs n0de-backend --lines 50
```

### Database
```bash
# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Reset database
npx prisma migrate reset --force --skip-seed

# Generate Prisma client
npx prisma generate
```

### Testing
```bash
# Test backend health
curl https://api.n0de.pro/api/v1/health

# Test Redis connection
redis-cli ping

# Test database connection
PGPASSWORD=postgres psql -U postgres -d n0de_production -h localhost -c "SELECT COUNT(*) FROM users;"
```

## File Organization

```
/home/sol/n0de-deploy/
├── backend/              # NestJS backend
│   ├── .env             # Environment variables
│   ├── redis/           # Redis service
│   └── logger/          # Winston logging
├── frontend/            # Next.js frontend
│   ├── .env.local       # Vercel environment
│   └── src/
├── prisma/              # Database schema & seed
├── nginx/               # Server configs
└── logs/                # Application logs
```

## Development Workflow

1. **Start Session**: `tmux attach -t n0de-dev`
2. **Edit Code**: Use Neovim in window 0
3. **Ask Claude**: Switch to window 1 for AI assistance
4. **Monitor**: Check logs in window 2
5. **Test Frontend**: Local dev server in window 3
6. **Database**: SQL queries in window 4

## Deployment Process

1. **Backend Changes**: 
   - Edit code in Neovim
   - `npm run build`
   - `pm2 restart n0de-backend`

2. **Frontend Changes**:
   - Edit code in Neovim
   - `cd frontend && npm run build`
   - `vercel --prod`

3. **Database Changes**:
   - Edit `prisma/schema.prisma`
   - `npx prisma migrate dev`
   - `npx prisma generate`

## Keyboard Shortcuts

- `Ctrl-b` + `0-4`: Switch tmux windows
- `Ctrl-b` + `%`: Split window vertically
- `Ctrl-b` + `"`: Split window horizontally
- `:q`: Exit Neovim
- `Ctrl-c`: Stop processes

## Health Checks

- **Backend**: https://api.n0de.pro/api/v1/health
- **Frontend**: https://n0de.pro
- **Database**: `pm2 logs n0de-backend | grep "Database connected"`
- **Redis**: `pm2 logs n0de-backend | grep "Redis connected"`