# 💰 Finance Tracker

A modern, full-stack personal finance management application built with Next.js 16, TypeScript, and Supabase. Track your expenses, manage accounts, set financial goals, and monitor your financial health with an intuitive dashboard.

## 🚀 Features

### ✅ **Currently Implemented**
- **Authentication System**
  - User registration and login with Supabase Auth
  - Protected routes with middleware
  - Session management with cookies
  - Auto-redirect logic for authenticated/unauthenticated users
  - Auto-initialize default wallets & categories on signup

- **Dashboard Overview**
  - Modern, responsive UI with dark/light theme
  - Real-time financial summaries
  - Recent transactions display
  - Account balance overview

- **Wallet Management** ✨
  - Create, edit, delete wallets
  - Real-time balance updates
  - Number formatting (Rp 1.000.000)
  - Inline edit mode with pencil icon
  - Default wallets for new users

- **Category Management** ✨
  - Create, delete categories
  - Type-based filtering (INCOME, EXPENSE, TRANSFER)
  - Color & icon customization
  - Default categories for new users

- **Transaction Management** ✨
  - Create transactions (Income, Expense, Transfer)
  - Transfer between wallets with balance validation
  - Real-time balance updates
  - Amount formatting with thousand separator
  - Date picker integration
  - Description support

- **API Infrastructure**
  - RESTful API routes with Next.js App Router
  - GET/POST/PUT/DELETE endpoints
  - Supabase integration for database operations
  - Type-safe API endpoints with TypeScript
  - Proper error handling & rollback
  - Ownership verification

### 🚧 **In Development**
- Transaction history page with filtering & search
- Budget management per category
- Financial goals tracking with progress
- Loan management & payment tracking
- Savings accounts with interest calculation
- Analytics dashboard & charts
- Data export (CSV, PDF)
- Recurring transactions
- Multi-currency support

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** Next.js 16.0.1 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + Custom components
- **Icons:** Lucide React
- **Notifications:** Sonner (Toast notifications)
- **Theme:** Next-themes (Dark/Light mode)

### **Backend**
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **API:** Next.js API Routes
- **ORM:** Supabase Client SDK

### **Development Tools**
- **Package Manager:** npm
- **Linting:** ESLint
- **Code Formatting:** Prettier (via ESLint config)
- **Type Checking:** TypeScript compiler

## 📁 Project Structure

```
finance-tracker/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes group
│   │   ├── layout.tsx           # Auth pages layout
│   │   ├── login/               
│   │   │   └── page.tsx         # Login page
│   │   └── signup/              
│   │       └── page.tsx         # Signup page
│   ├── (private)/               # Protected routes group
│   │   ├── layout.tsx           # Private pages layout
│   │   └── dashboard/           
│   │       └── page.tsx         # Dashboard page
│   ├── api/                     # API Routes
│   │   ├── accounts/            
│   │   │   └── route.ts         # Accounts API endpoint
│   │   └── categories/          
│   │       └── route.ts         # Categories API endpoint
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/                   # Reusable UI components
│   ├── ui/                      # Base UI components (Radix)
│   ├── account/                 # Account-specific components
│   ├── context/                 # React Context providers
│   │   └── AuthProvider.tsx     # Authentication context
│   ├── goal/                    # Financial goals components
│   ├── overview/                # Dashboard overview components
│   ├── transaction/             # Transaction-related components
│   ├── header.tsx               # Navigation header
│   ├── logo.tsx                 # Logo component
│   └── theme-provider.tsx       # Theme context provider
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   ├── use-mobile.ts           # Mobile detection hook
│   └── use-toast.ts            # Toast notifications hook
├── lib/                        # Utility libraries
│   └── utils.ts                # Utility functions
├── utils/                      # Configuration utilities
│   └── supabase/               # Supabase client configurations
│       ├── client.ts           # Browser client
│       ├── middleware.ts       # Middleware client
│       └── server.ts           # Server client
└── public/                     # Static assets
```

## 🗄️ Database Schema

Database menggunakan Supabase (PostgreSQL) dengan UUID untuk primary keys dan camelCase untuk column names.

### **Core Tables**

#### `accounts` (Wallets)
Menyimpan dompet/akun user (e.g., BCA, DANA, Cash)
```sql
CREATE TABLE accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  balance      NUMERIC NOT NULL DEFAULT 0,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- ✅ CONSTRAINT: Setiap user bisa punya wallet dengan nama yang sama
  CONSTRAINT accounts_name_user_unique UNIQUE (name, user_id)
);

-- Indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_is_default ON accounts(is_default);
```

#### `categories`
Kategori transaksi (Income, Expense, Transfer)
```sql
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
  color        TEXT,
  icon         TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- ✅ CONSTRAINT: Setiap user bisa punya category dengan nama yang sama
  CONSTRAINT categories_name_user_unique UNIQUE (name, user_id)
);

-- Indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_is_default ON categories(is_default);
```

#### `transactions`
Record transaksi user (Income, Expense, Transfer)
```sql
CREATE TABLE transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount         NUMERIC NOT NULL CHECK (amount > 0),
  type           TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
  "categoryId"   UUID REFERENCES categories(id) ON DELETE SET NULL, -- ✅ NULLABLE (NULL untuk TRANSFER)
  description    TEXT,
  date           TIMESTAMPTZ NOT NULL,
  "accountId"    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes untuk performa
CREATE INDEX idx_transactions_accountId ON transactions("accountId");
CREATE INDEX idx_transactions_categoryId ON transactions("categoryId");
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
```

#### `budgets`
Budget management per category
```sql
CREATE TABLE budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "categoryId"  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount        NUMERIC NOT NULL,
  period        TEXT NOT NULL, -- 'WEEKLY', 'MONTHLY', 'YEARLY'
  "startDate"   TIMESTAMPTZ NOT NULL,
  "endDate"     TIMESTAMPTZ NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `loans`
Loan tracking
```sql
CREATE TABLE loans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  "originalAmount"    NUMERIC NOT NULL,
  "currentBalance"    NUMERIC NOT NULL,
  "interestRate"      NUMERIC NOT NULL,
  "monthlyPayment"    NUMERIC NOT NULL,
  "nextPaymentDate"   TIMESTAMPTZ,
  "loanType"          TEXT NOT NULL, -- 'PERSONAL', 'MORTGAGE', 'AUTO', etc.
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `financial_goals`
Financial goals tracking
```sql
CREATE TABLE financial_goals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  "targetAmount"    NUMERIC NOT NULL,
  "currentAmount"   NUMERIC NOT NULL DEFAULT 0,
  "targetDate"      TIMESTAMPTZ,
  category          TEXT,
  description       TEXT,
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### **Template Tables**

#### `default_wallet_templates`
Template wallet yang akan di-copy untuk setiap user baru
```sql
CREATE TABLE default_wallet_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  balance       NUMERIC DEFAULT 0,
  order_index   INT DEFAULT 0,
  "createdAt"   TIMESTAMPTZ DEFAULT now()
);

-- Default data
INSERT INTO default_wallet_templates (name, balance, order_index) VALUES
('Cash', 0, 1),
('Bank Account', 0, 2),
('E-Wallet', 0, 3);
```

#### `default_category_templates`
Template categories yang akan di-copy untuk setiap user baru
```sql
CREATE TABLE default_category_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
  color         TEXT DEFAULT '#6B7280',
  icon          TEXT DEFAULT 'circle',
  order_index   INT DEFAULT 0,
  "createdAt"   TIMESTAMPTZ DEFAULT now()
);

-- Default data
INSERT INTO default_category_templates (name, type, color, icon, order_index) VALUES
-- EXPENSE
('Food & Dining', 'EXPENSE', '#EF4444', 'utensils', 1),
('Transportation', 'EXPENSE', '#F59E0B', 'car', 2),
('Shopping', 'EXPENSE', '#EC4899', 'shopping-bag', 3),
('Entertainment', 'EXPENSE', '#8B5CF6', 'film', 4),
('Bills & Utilities', 'EXPENSE', '#3B82F6', 'file-text', 5),
('Health', 'EXPENSE', '#10B981', 'heart', 6),
('Education', 'EXPENSE', '#06B6D4', 'book', 7),
('Other Expense', 'EXPENSE', '#6B7280', 'circle', 8),

-- INCOME
('Salary', 'INCOME', '#22C55E', 'dollar-sign', 9),
('Business', 'INCOME', '#14B8A6', 'briefcase', 10),
('Investment', 'INCOME', '#6366F1', 'trending-up', 11),
('Gift', 'INCOME', '#F97316', 'gift', 12),
('Other Income', 'INCOME', '#84CC16', 'circle', 13),

-- TRANSFER
('Transfer', 'TRANSFER', '#64748B', 'arrow-right', 14);
```

### **Soft Delete Tables**

#### `hidden_accounts`
Track hidden wallets per user (soft delete for system accounts)
```sql
CREATE TABLE hidden_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "account_id"  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  "hidden_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, "account_id")
);
```

#### `hidden_categories`
Track hidden categories per user (soft delete for system categories)
```sql
CREATE TABLE hidden_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "category_id"   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  "hidden_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, "category_id")
);
```

### **Key Relationships**
- `transactions.accountId` → `accounts.id` (Many-to-One) - Wallet source
- `transactions.categoryId` → `categories.id` (Many-to-One, NULLABLE) - NULL untuk TRANSFER
- `budgets.categoryId` → `categories.id` (Many-to-One)
- All main tables with `user_id` → `auth.users.id` (Multi-tenancy isolation)

### **Transaction Types Logic**

| Type     | categoryId | Balance Update                              |
|----------|-----------|---------------------------------------------|
| INCOME   | Required  | accountId balance += amount                 |
| EXPENSE  | Required  | accountId balance -= amount (check balance) |
| TRANSFER | NULL      | accountId -= amount, toAccountId += amount  |

### **Security (RLS)**
Row Level Security enabled untuk semua tables:
- Users hanya bisa akses data mereka sendiri (filtered by `user_id`)
- `transactions` ownership verified via `accounts.user_id`
- Default data (`is_default = true`) dibuat otomatis saat user signup
- User dapat menghapus semua data termasuk default data
- Setiap user bisa punya category/account dengan nama yang sama (isolated per user)
## 🔧 Installation & Setup

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Supabase account

### **1. Clone Repository**
```bash
git clone https://github.com/aziziega/finance-tracker.git
cd finance-tracker
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Setup**
Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **4. Database Setup**
1. Create a new Supabase project
2. Run the SQL schema (available in project docs)
3. Enable Row Level Security
4. Configure authentication providers

### **5. Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🚀 API Endpoints

### **Authentication**
- Authentication handled by Supabase Auth
- Session management via cookies
- Protected routes with middleware

### **Categories API**
```typescript
GET    /api/categories     # Get all transaction categories
POST   /api/categories     # Create new category (admin)
```

### **Accounts API** (In Development)
```typescript
GET    /api/accounts       # Get user accounts
POST   /api/accounts       # Create new account
PUT    /api/accounts/:id   # Update account
DELETE /api/accounts/:id   # Delete account
```

### **Transactions API** (Planned)
```typescript
GET    /api/transactions   # Get user transactions
POST   /api/transactions   # Create new transaction
PUT    /api/transactions/:id    # Update transaction
DELETE /api/transactions/:id    # Delete transaction
```

## 🎨 Design System

### **Color Palette**
- **Primary:** Tailwind default colors
- **Background:** Dynamic (light/dark theme)
- **Text:** Semantic color system
- **Accents:** Category-based color coding

### **Typography**
- **Font Family:** Geist (Vercel's font)
- **Scale:** Tailwind typography scale
- **Weights:** 400, 500, 600, 700

### **Components**
- **Base:** Radix UI primitives
- **Custom:** Extended components for finance features
- **Responsive:** Mobile-first design approach

## 📱 Responsive Design

### **Breakpoints**
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px  
- **Desktop:** > 1024px

### **Layout**
- **Mobile:** Single column, collapsible navigation
- **Desktop:** Multi-column dashboard, persistent sidebar

## 🔐 Security Features

### **Authentication**
- Secure session management
- JWT tokens via Supabase
- Auto-refresh token handling

### **Authorization**
- Row Level Security (RLS)
- User-scoped data access
- Protected API routes

### **Data Protection**
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🚀 Deployment

### **Recommended Platform: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### **Environment Variables**
Ensure these are set in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### **Build Configuration**
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev"
  }
}
```

## 🛣️ Roadmap

### **Phase 1: Core Features** ✅
- [x] Authentication system
- [x] Basic dashboard
- [x] Transaction categories
- [x] API infrastructure

### **Phase 2: Transaction Management** 🚧
- [ ] Complete transaction CRUD
- [ ] Account management
- [ ] Transaction filtering and search
- [ ] Bulk operations

### **Phase 3: Analytics & Insights** 📋
- [ ] Financial goals tracking
- [ ] Spending analytics
- [ ] Monthly/yearly reports
- [ ] Budget management

### **Phase 4: Advanced Features** 💡
- [ ] Loan management
- [ ] Investment tracking
- [ ] Receipt scanning
- [ ] Export/import functionality
- [ ] Mobile app (React Native)

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### **Code Standards**
- **TypeScript:** Strict mode enabled
- **ESLint:** Extended configurations
- **Formatting:** Prettier integration
- **Naming:** Consistent component and file naming

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📞 Contact

**Developer:** [aziziega](https://github.com/aziziega)  
**Project Link:** [https://github.com/aziziega/finance-tracker](https://github.com/aziziega/finance-tracker)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Lucide](https://lucide.dev/) - Icon library
