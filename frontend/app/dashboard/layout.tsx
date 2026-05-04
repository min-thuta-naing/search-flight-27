import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Dashboard - Flight Search',
  description: 'แดชบอร์ดวิเคราะห์ข้อมูลเที่ยวบิน',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-background">
      <Header />
      <main className="container mx-auto min-w-0 flex-1 py-6 md:px-4 lg:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
