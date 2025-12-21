# BetPot - Decentralized Prediction Market

A Web3 betting platform built on Cloudflare infrastructure with Solana integration.

## 🏗 Architecture

- **API**: Cloudflare Workers with Hono.js + D1 Database (SQLite)
- **Frontend**: React + Vite deployed to Cloudflare Pages
- **Database**: Cloudflare D1 with Drizzle ORM
- **Real-time**: Cloudflare Durable Objects for WebSocket connections
- **Blockchain**: Solana Web3.js for wallet integration

## 📁 Project Structure

```
betpot/
├── backend/                # Cloudflare Worker API
│   ├── src/
│   │   ├── db/            # Database schema & client
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes
│   │   └── index.ts       # Worker entry point
│   ├── wrangler.toml      # Cloudflare config
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # Zustand stores
│   │   ├── services/      # API client
│   │   └── types/         # TypeScript types
│   └── package.json
└── package.json            # Root monorepo config
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Setup

1. **Clone and install**
   ```bash
   cd betpot
   npm install
   ```

2. **Configure Cloudflare**
   ```bash
   # Login to Cloudflare
   wrangler login
   
   # Create D1 database
   wrangler d1 create betpot-db
   
   # Update wrangler.toml with your database_id
   ```

3. **Setup environment**
   ```bash
   # API
   cp api/.env.example api/.env
   # Edit api/.env with your values
   
   # Web
   cp web/.env.example web/.env
   ```

4. **Run database migrations**
   ```bash
   cd api
   npm run db:generate
   npm run db:migrate
   ```

5. **Start development**
   ```bash
   # From root
   npm run dev
   
   # API runs on http://localhost:8787
   # Web runs on http://localhost:3000
   ```

## 📡 API Endpoints

### Public
- `GET /api/events` - List active events
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/pool` - Get live pool stats

### Auth Required
- `POST /api/tickets/purchase` - Buy tickets
- `GET /api/tickets/my-tickets` - User's tickets
- `POST /api/tickets/claim` - Claim winnings

### Admin Only
- `GET /api/admin/dashboard` - Dashboard stats
- `POST /api/admin/events` - Create event
- `POST /api/admin/events/:id/resolve` - Set winner
- `GET /api/admin/events/:id/winners` - List winners
- `GET /api/admin/bets` - All bets with filters

## 🎮 How It Works

1. **Buy Tickets**: Users purchase tickets for their predicted outcome (1% platform fee per trade)
2. **Event Resolves**: Admin sets the winning option
3. **Winners Share Pool**: 
   - Winners receive their ticket back + full losing pool split equally
   - Payout = Ticket Price + (Losing Pool / Winner Count)
4. **Claim Winnings**: Winners claim payouts to their Solana wallet

## 🔐 Admin Access

Set admin emails in `wrangler.toml` or use role-based access:

```toml
[vars]
ADMIN_EMAILS = "admin@example.com,admin2@example.com"
```

Or promote users via database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 🚢 Deployment

### Deploy API
```bash
cd api
npm run deploy
```

### Deploy Frontend
```bash
cd web
npm run build
npm run deploy
# Or connect to Cloudflare Pages via Git
```

## 🔧 Configuration

### wrangler.toml
```toml
[vars]
TICKET_PRICE = "10"        # Default ticket price
PLATFORM_FEE = "0.01"      # 1% fee per trade (charged upfront)
MAX_EVENTS_PER_DAY = "3"   # Daily event limit
```

### Platform Settings (Admin UI)
- Ticket price
- Platform fee percentage
- Claim delay hours
- Maintenance mode

## 📊 Admin Dashboard Features

- **Overview**: Users, events, tickets, volume metrics
- **Event Management**: Create, edit, lock, resolve, cancel
- **Bet Management**: Filter by status, sort winners/losers
- **Winner Sorting**: View claimed/unclaimed, total payouts
- **User Management**: View stats, update roles
- **Audit Logs**: Track all admin actions
- **Settings**: Configure platform parameters

## 🛡 Security

- JWT authentication with 7-day expiry
- Role-based access control (user/admin/superadmin)
- Admin action audit logging
- Rate limiting via Cloudflare
- Input validation with Zod

## 📝 License

MIT
