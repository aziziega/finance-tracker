import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { format } from 'date-fns'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { rateLimit, getClientIdentifier, RateLimitPresets, createRateLimitResponse } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Rate limiting: Very strict for resource-intensive export (3 requests per 5 minutes)
        const rateLimitResult = await rateLimit(
            getClientIdentifier(request, user.id),
            RateLimitPresets.export
        )

        if (!rateLimitResult.success) {
            const response = createRateLimitResponse(rateLimitResult)
            return NextResponse.json(response.body, { 
                status: response.status,
                headers: response.headers 
            })
        }

        const searchParams = request.nextUrl.searchParams
        const exportFormat = searchParams.get('format') || 'csv'
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Start date and end date are required' },
                { status: 400 }
            )
        }

        // Get user's accounts
        const { data: accounts } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', user.id)

        const accountIds = (accounts || []).map(acc => acc.id)

        if (accountIds.length === 0) {
            return NextResponse.json(
                { error: 'No accounts found' },
                { status: 404 }
            )
        }

        // Fetch transactions with categories and accounts
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                *,
                categories (name, icon, color),
                accounts!fk_transaction_account (name)
            `)
            .in('accountId', accountIds)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false })

        if (error) {
            console.error('Database error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const dateRange = `${format(new Date(startDate), 'yyyy-MM-dd')}_to_${format(new Date(endDate), 'yyyy-MM-dd')}`

        if (exportFormat === 'csv') {
            return generateCSV(transactions || [], dateRange)
        } else if (exportFormat === 'pdf') {
            return await generatePDF(transactions || [], dateRange, startDate, endDate)
        } else {
            return NextResponse.json(
                { error: 'Invalid format. Use csv or pdf' },
                { status: 400 }
            )
        }
    } catch (error: any) {
        console.error('Export error:', error)
        return NextResponse.json(
            { 
                error: 'Failed to export data',
                details: error.message 
            },
            { status: 500 }
        )
    }
}

function generateCSV(transactions: any[], dateRange: string) {
    // CSV Headers
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Wallet']
    
    // CSV Rows
    const rows = transactions.map(t => [
        format(new Date(t.date), 'yyyy-MM-dd HH:mm:ss'),
        t.type,
        t.categories?.name || 'N/A',
        t.description || '',
        t.amount,
        t.accounts?.name || 'N/A'
    ])

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Return as downloadable file
    return new NextResponse(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="transactions-${dateRange}.csv"`,
            'Cache-Control': 'no-cache'
        }
    })
}

async function generatePDF(transactions: any[], dateRange: string, startDate: string, endDate: string) {
    // Calculate summary
    const totalIncome = transactions
        .filter(t => t.type === 'INCOME' && !t.is_initial_balance)
        .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const totalExpense = transactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const balance = totalIncome - totalExpense

    // HTML template
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Transaction Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: white;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
        }
        h1 {
            color: #1e293b;
            font-size: 32px;
            margin-bottom: 10px;
        }
        .date-range {
            color: #64748b;
            font-size: 14px;
            margin-top: 8px;
        }
        .summary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            margin: 25px 0;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .summary h2 {
            font-size: 20px;
            margin-bottom: 15px;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            padding-bottom: 10px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 15px;
        }
        .summary-item {
            text-align: center;
            padding: 15px;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
        }
        .summary-label {
            font-size: 12px;
            opacity: 0.9;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .summary-value {
            font-size: 24px;
            font-weight: bold;
        }
        .summary-value.positive {
            color: #86efac;
        }
        .summary-value.negative {
            color: #fca5a5;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 25px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        thead {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
        }
        th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        tbody tr {
            border-bottom: 1px solid #e2e8f0;
            transition: background 0.2s;
        }
        tbody tr:hover {
            background: #f8fafc;
        }
        tbody tr:last-child {
            border-bottom: none;
        }
        td {
            padding: 12px 15px;
            font-size: 14px;
        }
        .amount {
            font-weight: 600;
            font-family: 'Courier New', monospace;
        }
        .amount.income {
            color: #16a34a;
        }
        .amount.expense {
            color: #dc2626;
        }
        .type-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .type-income {
            background: #dcfce7;
            color: #166534;
        }
        .type-expense {
            background: #fee2e2;
            color: #991b1b;
        }
        .type-transfer {
            background: #dbeafe;
            color: #1e40af;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
            border-top: 2px solid #e2e8f0;
            padding-top: 20px;
        }
        .transaction-count {
            background: #f1f5f9;
            padding: 12px 20px;
            border-radius: 8px;
            display: inline-block;
            margin: 20px 0;
            font-size: 14px;
            color: #475569;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Transaction Report</h1>
        <p class="date-range">
            Period: ${format(new Date(startDate), 'MMMM dd, yyyy')} - ${format(new Date(endDate), 'MMMM dd, yyyy')}
        </p>
    </div>
    
    <div class="summary">
        <h2>Financial Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Total Income</div>
                <div class="summary-value positive">+ Rp ${totalIncome.toLocaleString('id-ID')}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Expense</div>
                <div class="summary-value negative">- Rp ${totalExpense.toLocaleString('id-ID')}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Net Balance</div>
                <div class="summary-value ${balance >= 0 ? 'positive' : 'negative'}">
                    ${balance >= 0 ? '+' : ''} Rp ${balance.toLocaleString('id-ID')}
                </div>
            </div>
        </div>
    </div>

    <div class="transaction-count">
        📝 Total Transactions: <strong>${transactions.length}</strong>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
                <th>Wallet</th>
            </tr>
        </thead>
        <tbody>
            ${transactions.map(t => `
                <tr>
                    <td>${format(new Date(t.date), 'MMM dd, yyyy HH:mm')}</td>
                    <td>
                        <span class="type-badge type-${t.type.toLowerCase()}">
                            ${t.type}
                        </span>
                    </td>
                    <td>${t.categories?.name || 'N/A'}</td>
                    <td>${t.description || '-'}</td>
                    <td class="amount ${t.type === 'INCOME' ? 'income' : t.type === 'EXPENSE' ? 'expense' : ''}" style="text-align: right;">
                        ${t.type === 'EXPENSE' ? '- ' : t.type === 'INCOME' ? '+ ' : ''}Rp ${Number(t.amount).toLocaleString('id-ID')}
                    </td>
                    <td>${t.accounts?.name || 'N/A'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
        <p>Finance Tracker - Personal Finance Management System</p>
    </div>
</body>
</html>
    `

    try {
        // Check if puppeteer is available (for development)
        let browser
        try {
            browser = await puppeteer.launch({
                args: chromium.args,
                 defaultViewport: null,
                executablePath: await chromium.executablePath(),
                headless: true,
            })
        } catch (launchError) {
            console.error('Puppeteer launch failed, falling back to HTML:', launchError)
            // Fallback to HTML if Puppeteer fails
            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'text/html',
                    'Content-Disposition': `attachment; filename="transactions-${dateRange}.html"`,
                    'Cache-Control': 'no-cache'
                }
            })
        }

        const page = await browser.newPage()
        
        // Set content and wait for load
        await page.setContent(html, {
            waitUntil: 'networkidle0'
        })

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        })

        await browser.close()

        // Return PDF with proper Buffer type
        return new NextResponse(Buffer.from(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="transactions-${dateRange}.pdf"`,
                'Cache-Control': 'no-cache'
            }
        })
    } catch (error) {
        console.error('PDF generation error:', error)
        // Final fallback to HTML
        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="transactions-${dateRange}.html"`,
                'Cache-Control': 'no-cache'
            }
        })
    }
}
