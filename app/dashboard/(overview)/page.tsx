import { Card } from '@/app/ui/dashboard/cards';
import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import LatestInvoices from '@/app/ui/dashboard/latest-invoices';
import { lusitana } from '@/app/ui/fonts';
import { fetchCardData } from '@/app/lib/data';
import { Suspense } from 'react';
import {
  RevenueChartSkeleton,
  LatestInvoicesSkeleton,
} from '@/app/ui/skeletons';
 
export default async function Page() {
  try {
    console.log('Dashboard page: Fetching card data...');
    
    const {
      numberOfInvoices,
      numberOfCustomers,
      totalPaidInvoices,
      totalPendingInvoices,
    } = await fetchCardData();
    
    console.log('Dashboard page: Data loaded successfully');
    
    return (
      <main>
        <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
          Dashboard
        </h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Collected" value={totalPaidInvoices} type="collected" />
          <Card title="Pending" value={totalPendingInvoices} type="pending" />
          <Card title="Total Invoices" value={numberOfInvoices} type="invoices" />
          <Card
            title="Total Customers"
            value={numberOfCustomers}
            type="customers"
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
          <Suspense fallback={<RevenueChartSkeleton />}>
            <RevenueChart />
          </Suspense>
          <Suspense fallback={<LatestInvoicesSkeleton />}>
            <LatestInvoices />
          </Suspense>
        </div>
      </main>
    );
  } catch (error) {
    console.error('Dashboard page error:', error);
    
    // Fallback UI jika error total
    return (
      <main>
        <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
          Dashboard
        </h1>
        <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
          <h2 className="text-lg font-semibold">Database Connection Issue</h2>
          <p className="mt-2">
            Unable to load dashboard data. Please check your database connection.
          </p>
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">Technical Details</summary>
            <pre className="mt-2 text-sm">
              {error instanceof Error ? error.message : 'Unknown error'}
            </pre>
          </details>
        </div>
      </main>
    );
  }
}