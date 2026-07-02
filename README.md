# Next.js SaaS Template

A production-grade, full-stack SaaS template built with modern technologies.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Auth.js (NextAuth) with Credentials Provider
- **State Management:** TanStack React Query
- **UI Components:** shadcn/ui + Tailwind CSS
- **Form Handling:** React Hook Form + Zod
- **Testing:** Jest + React Testing Library + MSW
- **Code Quality:** ESLint + Prettier + Husky

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Auth endpoints
│   │   └── posts/        # Posts CRUD API
│   ├── auth/             # Auth pages (login, register)
│   └── dashboard/        # Protected dashboard
├── components/            # UI Components
│   └── ui/               # shadcn/ui components
├── features/             # Feature modules
│   └── posts/            # Posts feature
│       ├── api/          # API client functions
│       ├── components/   # Feature components
│       ├── hooks/        # React Query hooks
│       └── schemas/      # Zod schemas
├── lib/                  # Utilities
│   ├── api/              # API client layer
│   └── auth/             # Auth.js configuration
├── prisma/               # Database schema & migrations
└── tests/                # Test files
    ├── mocks/            # MSW handlers
    └── unit/             # Unit tests
```

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/next-prisma-saas-template.git
   cd next-prisma-saas-template
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database URL and auth secret:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/saas_template"
   AUTH_SECRET="your-secret-key-here"
   ```

4. Run database migrations:
   ```bash
   pnpm db:migrate
   ```

5. (Optional) Seed the database:
   ```bash
   pnpm db:seed
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

## 🔐 Authentication

The template uses Auth.js with a Credentials provider for email/password authentication.

### Demo Credentials

After seeding the database:
- Email: `demo@example.com`
- Password: `password123`

### Protected Routes

Routes under `/dashboard` are protected and require authentication. The middleware automatically redirects unauthenticated users to the login page.

## 📝 API Endpoints

### Posts API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/posts` | List all posts | No |
| GET | `/api/posts/:id` | Get a single post | No |
| POST | `/api/posts` | Create a post | Yes |
| PATCH | `/api/posts/:id` | Update a post | Yes (owner only) |
| DELETE | `/api/posts/:id` | Delete a post | Yes (owner only) |

### Example Usage

```typescript
// Using React Query hooks
import { usePosts, useCreatePost } from "@/features/posts";

function PostsList() {
  const { data: posts, isLoading } = usePosts();
  const createPost = useCreatePost();

  const handleCreate = async () => {
    await createPost.mutateAsync({
      title: "New Post",
      content: "Post content here",
    });
  };

  // ...
}
```

## 🧪 Testing

The template includes Jest, React Testing Library, and MSW for testing.

### Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

### Test Structure

- `tests/unit/` - Unit tests for components and hooks
- `tests/mocks/` - MSW handlers for API mocking

## 🎨 UI Components

The template includes these shadcn/ui components:

- **Button** - Various button styles and sizes
- **Input** - Text input with validation support
- **Card** - Content container with header/footer
- **Dialog** - Modal dialogs
- **Label** - Form labels
- **Spinner** - Loading indicator
- **Toast** - Toast notifications

### Using Components

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

## 🔄 Form Validation

Forms use React Hook Form with Zod for end-to-end validation:

```typescript
import { postSchema, type PostFormData } from "@/features/posts/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm<PostFormData>({
  resolver: zodResolver(postSchema),
});
```

## 🌙 Dark Mode

The template supports dark mode out of the box. Add the `dark` class to the `<html>` element to enable it.

## 📦 Database Models

### User
```prisma
model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  posts        Post[]
}
```

### Post
```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variables:
   - `DATABASE_URL`
   - `AUTH_SECRET`
4. Deploy!

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ using Next.js, Prisma, and shadcn/ui
