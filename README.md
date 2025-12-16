# Parallel Resume - Professional Resume Builder

[中文文档](./README.zh-CN.md) | English

Parallel Resume is a modern resume management platform that helps users create, manage, and export professional resumes. The platform provides an intuitive editing interface, multi-version management, and one-click PDF export functionality.

## ✨ Core Features

### 📝 Resume Editing
- **Intuitive Interface**: Easy-to-use editing interface for managing personal information, work experience, education, and projects
- **Real-time Preview**: See changes as you make them
- **Rich Content**: Support for detailed work experience, education background, and project descriptions

### 📄 Multi-version Management
- **Multiple Resumes**: Create and manage multiple resume versions
- **Quick Duplication**: Easily copy existing resumes for different job applications
- **Batch Updates**: Update contact information across multiple resumes at once

### 💾 PDF Export
- **One-click Export**: Generate professional PDF resumes with a single click
- **A4 Standard**: Perfect formatting for printing and online submission
- **High Quality**: Professional output suitable for job applications

### 👥 User System
- **Multiple Login Methods**: Support for Google OAuth and username/password authentication
- **Role Permissions**: Three-tier permission management (owner/admin/user)
- **Login History**: Track login activity for security

### 🎨 Modern Interface
- **Responsive Design**: Perfect adaptation for desktop and mobile devices
- **Dark Mode**: Support for light and dark theme switching
- **Smooth Interactions**: Beautiful animation effects based on Framer Motion

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React full-stack framework with App Router
- **[React 18](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[HeroUI v2](https://heroui.com/)** - Modern React UI component library
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Animation library
- **[Lucide React](https://lucide.dev/)** - Icon library

### Backend
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication solution
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe TypeScript ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[Puppeteer](https://pptr.dev/)** - PDF generation

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL database
- pnpm package manager

### Steps

1. Clone the repository
```bash
git clone https://github.com/yourusername/parallel-resume.git
cd parallel-resume
```

2. Install dependencies
```bash
pnpm install
```

3. Configure environment variables
```bash
cp env.example .env
```

Edit `.env` file and configure:
- Database connection string
- NextAuth configuration
- Google OAuth credentials (optional)

4. Initialize database
```bash
pnpm db:generate
pnpm db:migrate
```

5. Start development server
```bash
pnpm dev
```

Visit `http://localhost:3100` to see your application.

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker
```bash
docker build -t parallel-resume .
docker run -p 3100:3100 parallel-resume
```

## 📝 Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/parallel-resume

# NextAuth
NEXTAUTH_URL=http://localhost:3100
NEXTAUTH_SECRET=your-secret-key

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [HeroUI](https://heroui.com/) - Beautiful UI components
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database toolkit