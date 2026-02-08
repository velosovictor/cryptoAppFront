# RBloks React Template

A clean, production-ready React template with authentication and CRUD operations built-in.

## 🚀 Features

- **React 19** - Latest React with modern hooks
- **Vite 7** - Lightning fast build tool
- **TypeScript** - Type-safe development
- **MUI v7** - Beautiful Material Design components
- **Authentication Ready** - Login, register, Google OAuth, password reset
- **CRUD Operations** - Ready-to-use API client for database operations
- **Beautiful Theme** - Professional warm beige design with customizable theme
- **Responsive Navbar** - Configurable navigation with auth state handling

## 📦 Tech Stack

| Package | Purpose |
|---------|---------|
| `@rationalbloks/frontblok-auth` | Authentication (login, register, OAuth, tokens) |
| `@rationalbloks/frontblok-crud` | CRUD operations (list, get, create, update, delete) |
| `@rationalbloks/frontblok-components` | Reusable UI (AuthView, ErrorBoundary, ConfirmationModal, Navbar) |
| `@tanstack/react-query` | Server state management |
| `@mui/material` | UI components |
| `react-router-dom` | Routing |

## 🏁 Quick Start

```bash
# Clone the template
git clone https://github.com/velosovictor/rbloks-react-template.git my-app
cd my-app

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## 📁 Project Structure

```
src/
├── App.tsx                    # Main app with routes
├── main.tsx                   # Entry point
├── components/
│   ├── shared/                # Shared utility components (if any)
│   └── views/                 # Application-specific views
│       ├── DashboardView.tsx
│       ├── HomeView.tsx
│       └── SettingsView.tsx
├── config/
│   ├── branding.ts            # App branding configuration
│   └── Navbar.tsx             # Navbar configuration
├── services/
│   └── datablokApi.ts         # API service (auth + CRUD)
├── styles/
│   └── globals.css            # Global styles + CSS variables
└── theme/
    └── index.ts               # MUI theme configuration
```

**External packages provide:**
- `@rationalbloks/frontblok-auth` - Authentication (login, register, OAuth, tokens)
- `@rationalbloks/frontblok-crud` - CRUD operations (list, get, create, update, delete)
- `@rationalbloks/frontblok-components` - Reusable UI (AuthView, ErrorBoundary, Navbar factory, etc.)

## ⚙️ Configuration

### 1. Environment Variables

Edit `.env` with your backend URL:

```env
VITE_DATABASE_API_URL=https://your-api.example.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 2. Customize Navbar

Edit `src/config/Navbar.tsx`:

```tsx
const BRAND_CONFIG = {
  name: 'Your App Name',
  logo: '/your-logo.png',
};

const PUBLIC_NAV_ITEMS: NavigationItem[] = [
  { id: '/', label: 'Home', icon: <HomeIcon /> },
  { id: '/pricing', label: 'Pricing', icon: <PricingIcon /> },
];

const AUTHENTICATED_NAV_ITEMS: NavigationItem[] = [
  { id: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
];
```

### 3. Define Your Entities

Edit `src/services/datablokApi.ts`:

```tsx
// Define your entity types
export interface Product {
  id: string;
  name: string;
  price: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Add entity names
export const ENTITIES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
} as const;
```

### 4. Use CRUD Operations

```tsx
import { getApi, ENTITIES, Product } from '../services/datablokApi';

// List all products
const products = await getApi().list<Product>(ENTITIES.PRODUCTS);

// Create a product
const newProduct = await getApi().create<Product>(ENTITIES.PRODUCTS, {
  name: 'Widget',
  price: 29.99,
});

// Update a product
await getApi().update<Product>(ENTITIES.PRODUCTS, productId, {
  price: 24.99,
});

// Delete a product
await getApi().delete(ENTITIES.PRODUCTS, productId);
```

## 🎨 Theming

Customize the theme in `src/theme/index.ts`:

```tsx
export const palette = {
  primary: {
    main: '#1e40af', // Your brand color
  },
  background: {
    default: 'hsl(33.3, 60%, 97.1%)', // Warm beige
  },
};

// Or use the factory with overrides
const theme = createAppTheme({
  paletteOverrides: {
    primary: { main: '#your-color' },
  },
});
```

## 🚢 Deployment

The template includes Docker and Kubernetes configurations:

```bash
# Build Docker image
docker build -t my-app .

# Deploy to Kubernetes
python3 deploy.py
```

## 📝 License

MIT License - feel free to use this template for any project.

## 🙏 Credits

Built with [frontblok-auth](https://www.npmjs.com/package/@rationalbloks/frontblok-auth) and [frontblok-crud](https://www.npmjs.com/package/@rationalbloks/frontblok-crud).
