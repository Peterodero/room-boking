import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "US Room Stays — Premium Room Rentals & Holds",
  description: "Book verified rooms across the US. Pay booking fee securely via Cash App Pay.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} US RoomStays Inc. Built for US Citizen Rental Holds & Cash App Pay.</p>
        </footer>
      </body>
    </html>
  );
}
