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
  const dashboardNotice =
    'หน้าแดชบอร์ดส่วนนี้ยังอยู่ระหว่างการพัฒนา ข้อมูลบางส่วนอ้างอิงจาก mockup และบางส่วนดึงจากฐานข้อมูลจริง มุมมองที่แสดงเป็น visualization หลักสำหรับการนำเสนอเบื้องต้น';

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-background">
      <Header />
      <div className="dashboard-dev-banner sticky top-16 z-40 border-b border-primary/20 bg-primary/10 backdrop-blur-sm">
        <div className="container mx-auto overflow-hidden px-4 sm:px-6">
          <p className="dashboard-dev-banner-track whitespace-nowrap py-2 text-sm font-medium text-primary">
            <span className="inline-flex items-center pr-16">
              <span className="mr-2 font-extrabold text-red-600">ประกาศ:</span>
              <span>{dashboardNotice}</span>
            </span>
            <span className="inline-block pr-16" aria-hidden="true">
              <span className="mr-2 font-extrabold text-red-600">ประกาศ:</span>
              {dashboardNotice}
            </span>
          </p>
        </div>
      </div>
      <main className="container mx-auto min-w-0 flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}
