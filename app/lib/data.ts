import { neon } from '@neondatabase/serverless';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

// Gunakan HTTP connection (bukan TCP)
// Ini akan menghindari masalah ETIMEDOUT karena menggunakan HTTP POST
const sql = neon(process.env.DATABASE_URL!);

export async function fetchRevenue() {
  try {
    console.log('📊 Fetching revenue data...');
    const startTime = Date.now();
    
    // HTTP driver menggunakan promise-based API
    const data = await sql`SELECT * FROM revenue`;
    
    console.log(`✅ Revenue fetched in ${Date.now() - startTime}ms`);
    return data as Revenue[];
  } catch (error) {
    console.error('❌ Database Error (fetchRevenue):', error);
    return [];
  }
}

export async function fetchLatestInvoices() {
  try {
    console.log('📄 Fetching latest invoices...');
    const startTime = Date.now();
    
    const data = await sql`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5
    `;
    
    const latestInvoices = (data as LatestInvoiceRaw[]).map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    
    console.log(`✅ Latest invoices fetched in ${Date.now() - startTime}ms`);
    return latestInvoices;
  } catch (error) {
    console.error('❌ Database Error (fetchLatestInvoices):', error);
    return [];
  }
}

export async function fetchCardData() {
  try {
    console.log('💳 Fetching card data...', new Date().toISOString());
    const startTime = Date.now();
    
    // HTTP driver bisa melakukan multiple queries secara paralel
    const [invoiceCountResult, customerCountResult, invoiceStatusResult] = await Promise.all([
      sql`SELECT COUNT(*) FROM invoices`,
      sql`SELECT COUNT(*) FROM customers`,
      sql`
        SELECT
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS paid,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending
        FROM invoices
      `
    ]);

    const numberOfInvoices = Number((invoiceCountResult as any)[0]?.count ?? 0);
    const numberOfCustomers = Number((customerCountResult as any)[0]?.count ?? 0);
    const totalPaidInvoices = formatCurrency(Number((invoiceStatusResult as any)[0]?.paid ?? 0));
    const totalPendingInvoices = formatCurrency(Number((invoiceStatusResult as any)[0]?.pending ?? 0));

    console.log(`✅ Card data fetched in ${Date.now() - startTime}ms`);
    console.log(`📊 Stats: ${numberOfInvoices} invoices, ${numberOfCustomers} customers`);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('❌ Database Error (fetchCardData):', error);
    return {
      numberOfCustomers: 0,
      numberOfInvoices: 0,
      totalPaidInvoices: formatCurrency(0),
      totalPendingInvoices: formatCurrency(0),
    };
  }
}

export const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(query: string, currentPage: number) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  try {
    const invoices = await sql`
      SELECT
        invoices.id, invoices.amount, invoices.date, invoices.status,
        customers.name, customers.email, customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    return invoices as InvoicesTable[];
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const data = await sql`
      SELECT COUNT(*)
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
    `;
    const totalPages = Math.ceil(Number((data as any)[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    return 0;
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql`
      SELECT invoices.id, invoices.customer_id, invoices.amount, invoices.status
      FROM invoices
      WHERE invoices.id = ${id}
    `;
    const invoice = (data as InvoiceForm[]).map((invoice) => ({
      ...invoice,
      amount: invoice.amount / 100,
    }));
    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}

export async function fetchCustomers() {
  try {
    const customers = await sql`
      SELECT id, name
      FROM customers
      ORDER BY name ASC
    `;
    return customers as CustomerField[];
  } catch (err) {
    console.error('Database Error:', err);
    return [];
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql`
      SELECT
        customers.id, customers.name, customers.email, customers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
      FROM customers
      LEFT JOIN invoices ON customers.id = invoices.customer_id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
      GROUP BY customers.id, customers.name, customers.email, customers.image_url
      ORDER BY customers.name ASC
    `;
    const customers = (data as CustomersTableType[]).map((customer) => ({
      ...customer,
      total_pending: formatCurrency(Number(customer.total_pending)),
      total_paid: formatCurrency(Number(customer.total_paid)),
    }));
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    return [];
  }
}