# NanoSol CRM

A high-end, AI-powered Customer Relationship Management platform built with Next.js 14, Supabase, and modern web technologies.

## 🚀 Features

### Core CRM Modules

- **Contacts & Leads** - Full CRUD with custom fields, tags, segmentation, and AI-powered lead scoring
- **Deals & Pipeline** - Visual Kanban board with drag-and-drop, forecasting, and probability tracking
- **Unified Activity Timeline** - Chronological feed of all interactions (calls, emails, notes, meetings)
- **Calendar & Scheduling** - Integrated calendar with event management and meeting scheduler

### Communication Suite

- **SIP/WebRTC Calling** - Built-in dialer widget with call logging and quality monitoring
- **Email Engine** - SMTP integration with bulk sending, templates, and tracking
- **Email Sequences** - Automated drip campaigns with A/B testing

### Automation & AI

- **Workflow Automation** - No-code visual builder for triggers and actions
- **AI Intelligence** - Smart summaries, predictive scoring, and AI copilot
- **Vector Search** - Semantic search powered by pgvector

### Enterprise Features

- **Multi-tenancy** - Subdomain-based organization isolation
- **White-label Support** - Custom branding (logo, colors, fonts)
- **Role-based Access** - Admin, Manager, Agent, Viewer roles
- **GDPR Compliance** - Data export and deletion tools

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Animation**: Framer Motion
- **State**: Zustand + SWR
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Deployment**: Vercel

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/nanosol-crm.git
cd nanosol-crm
```

1. Install dependencies:

```bash
npm install
```

1. Set up environment variables:

```bash
cp .env.example .env.local
```

1. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

1. Run the Supabase schema:
   - Go to your Supabase dashboard
   - Open the SQL Editor
   - Copy and run the contents of `supabase/schema.sql`

2. Start the development server:

```bash
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
nanosol-crm/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Dashboard routes
│   │   ├── contacts/
│   │   ├── deals/
│   │   ├── calendar/
│   │   ├── calls/
│   │   ├── email/
│   │   ├── automations/
│   │   └── settings/
│   ├── login/
│   ├── signup/
│   └── page.tsx            # Landing page
├── components/
│   ├── dashboard/          # Dashboard-specific components
│   ├── providers/          # React context providers
│   └── ui/                 # Shadcn UI components
├── hooks/                  # Custom React hooks
├── lib/
│   ├── supabase/           # Supabase client configs
│   ├── stores.ts           # Zustand stores
│   └── utils.ts            # Utility functions
├── supabase/
│   └── schema.sql          # Database schema
├── types/                  # TypeScript type definitions
└── public/                 # Static assets
```

## 🔧 Configuration

### SIP/VoIP Setup

1. Go to Settings > Integrations > SIP Configuration
2. Enter your SIP credentials (username, password, domain)
3. The dialer widget will appear in the bottom-right corner

### SMTP Setup

1. Go to Settings > Integrations > SMTP Configuration
2. Enter your SMTP server details
3. Test the connection before saving

### AI Features

1. Add your OpenAI API key in Settings > Integrations > API Keys
2. AI features will automatically be enabled

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables
4. Deploy!

```bash
vercel --prod
```

## 📋 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `NEXT_PUBLIC_APP_URL` | Your application URL |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
