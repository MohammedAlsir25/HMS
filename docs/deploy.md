# Deployment Guide

## Architecture

```
                         ┌─────────────┐
                         │   Caddy     │
                         │ Reverse Proxy│
                         │ Port 80/443 │
                         └──────┬──────┘
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
          ┌───────┴───────┐ ┌──┴──┐  ┌───────┴───────┐
          │   Frontend    │ │ API │  │   PostgreSQL  │
          │  Nginx static  │ │Express│  │    16         │
          │   :3000       │ │:4001│  │   :5432      │
          └───────────────┘ └─────┘  └───────────────┘
```

## Prerequisites

- Docker & Docker Compose v2+
- Domain name with DNS pointing to your server
- Supabase account (for file storage)
- (Optional) Gemini API key for AI diagnosis

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/hms

# JWT
JWT_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PATIENT_JWT_SECRET=<generate: openssl rand -hex 32>

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET=hospital-files

# Optional
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
```

> **Important:** Use the Docker service name `postgres` as the hostname (not `localhost`).

## Deployment Steps

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/hms.git
cd hms
cp backend/.env.example backend/.env
# Edit backend/.env with your values
```

### 2. Configure Caddy (TLS)

Edit `Caddyfile` and replace `your-domain.com` with your actual domain:

```
your-domain.com {
    reverse_proxy frontend:3000
}

api.your-domain.com {
    reverse_proxy backend:4001
}
```

Caddy will automatically provision and renew Let's Encrypt TLS certificates.

### 3. Deploy

```bash
docker compose up -d
```

This starts all 4 services: postgres, backend, frontend, caddy.

### 4. Initialize Database

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```

### 5. Verify

```bash
docker compose ps
# All services should show "Up"
```

## Backup

### Automated (Docker)

```bash
# Run backup
docker compose exec postgres pg_dump -U postgres hms > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use the backup script
bash scripts/backup.sh
```

### Automated (via cron)

Add to crontab for daily backups at 2 AM:

```cron
0 2 * * * cd /opt/hms && bash scripts/backup.sh
```

### Restore

```bash
# From file
docker compose exec -T postgres psql -U postgres hms < backup_file.sql

# Or use the restore script
bash scripts/restore.sh
```

## Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/system/health` | System health (protected, admin only) |
| `GET /api/health` | Simple health check (public) |

The system health dashboard is available at: Admin → System tab.

## Monitoring

- **Caddy logs:** `docker compose logs caddy`
- **Backend logs:** `docker compose logs backend`
- **Postgres logs:** `docker compose logs postgres`
- **System health:** Admin panel → System tab (shows active users, queue depth, error count, DB status)

## Scaling

The backend is stateless and can be horizontally scaled:

```yaml
# docker-compose.override.yml
services:
  backend:
    deploy:
      replicas: 3
```

Add a load balancer (Caddy supports this natively) or use Docker Swarm / Kubernetes for production clusters.

## Rollback

```bash
# Revert to previous Docker image
docker compose stop backend
docker compose rm backend
# Tag previous image and restart
```

For database rollback, restore from a backup.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Caddy TLS error | Ensure port 80/443 are open and DNS resolves to server IP |
| Backend can't connect to DB | Check `DATABASE_URL` uses `postgres` as hostname (not `localhost`) |
| Prisma migration fails | Run `docker compose exec backend npx prisma migrate deploy` manually |
| File upload fails | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` |
| Lost admin password | Use `docker compose exec backend node scripts/reset-admin.js` |

## Security Checklist

- [ ] Use strong, unique JWT secrets (at least 32 bytes each)
- [ ] Enable HTTPS (Caddy handles this automatically)
- [ ] Set `NODE_ENV=production` in production
- [ ] Restrict DB access to only the application
- [ ] Enable rate limiting (built-in)
- [ ] Regular backup schedule configured
- [ ] Monitor audit logs (`audit_logs` table)
- [ ] Keep dependencies updated (`docker compose build --no-cache`)
