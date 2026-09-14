import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "US Room Stays — Premium Room Rentals & Holds",
  description: "Book verified rooms across the US. Pay booking fee securely via Cash App Pay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen flex flex-col font-sans antialiased transition-colors duration-200">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 dark:border-white/10 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} US RoomStays Inc. Built for US Citizen Rental Holds & Cash App Pay.</p>
        </footer>
      </body>
    </html>
  );
}
