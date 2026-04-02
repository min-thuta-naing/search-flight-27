import { DrillDownDashboard } from '@/components/dashboard/drill-down/DrillDownDashboard';

export const metadata = {
  title: 'แดชบอร์ด | Flight Search',
  description: 'แดชบอร์ดวิเคราะห์ข้อมูลเที่ยวบิน สถิติการบินทั่วโลก และแนวโน้มเส้นทาง',
};

export default function DashboardPage() {
  return <DrillDownDashboard />;
}
