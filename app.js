// --- STATE & UTILS ---
let currentTab = 'admin';

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await initDatabase();
    updateDashboardStats();
    renderExpenses();
    renderStock();
    renderWorkshopOrders();

    // Set current date in forms if needed
    // document.getElementById('orderDate').valueAsDate = new Date();
});

// --- NAVIGATION ---
function switchTab(tab) {
    currentTab = tab;

    // Update Sidebar/Nav Active State
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('bg-green-700', 'text-white');
            btn.classList.remove('text-green-100', 'hover:bg-green-800');
        } else {
            btn.classList.remove('bg-green-700', 'text-white');
            btn.classList.add('text-green-100', 'hover:bg-green-800');
        }
    });

    // Show/Hide Sections
    document.getElementById('admin-section').classList.toggle('hidden', tab !== 'admin');
    document.getElementById('workshop-section').classList.toggle('hidden', tab !== 'workshop');

    // Refresh Data on Switch
    if (tab === 'admin') {
        updateDashboardStats();
        renderExpenses();
        renderStock();
    } else {
        renderWorkshopOrders();
    }
}

// --- UTILS ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
}

function showToast(title, icon = 'success') {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: icon,
        title: title
    });
}

// --- ADMIN: DASHBOARD STATS ---
async function updateDashboardStats() {
    const orders = await db.orders.toArray();
    const expenses = await db.expenses.toArray();

    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    // For Income, let's assume we don't track income value in orders yet based on schema, 
    // but users might want to see order count.

    document.getElementById('stat-pending').innerText = pendingCount;
    document.getElementById('stat-completed').innerText = completedCount;
    document.getElementById('stat-expenses').innerText = formatCurrency(totalExpenses);
}

// --- ADMIN: ORDERS ---
// Auto-replace multiplication 'x' with '*'
document.getElementById('fullOrderDetails').addEventListener('input', function () {
    // Only replace if followed by a space to avoid breaking continuous words
    // but try to catch "2x " => "2* " and "2 x " => "2 * "
    // Regex: digit, optional space, x/X, followed by space or end of line (if we want realtime)
    // Actually, simple replace is safer for UX, let's do it carefully.

    const cursor = this.selectionStart;
    const oldVal = this.value;

    // Replace "Digit x Space" or "Digit Space x Space" with "*"
    // We use a regex that looks for: (\d+)(\s*)[xX](\s)
    // And replace with: $1$2*$3
    const newVal = oldVal.replace(/(\d+)(\s*)[xX](\s)/g, '$1$2*$3');

    if (newVal !== oldVal) {
        this.value = newVal;
        // Restore cursor - simplistic approach, might be off if length changes 
        // (but here length is same or similar, 'x' -> '*')
        this.selectionStart = this.selectionEnd = cursor;
    }
});

document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get the full text block
    const fullDetails = document.getElementById('fullOrderDetails').value.trim();

    // Simple heuristic: First line is the "Customer Name" for list views
    // If empty, default to "Customer"
    const lines = fullDetails.split('\n');
    const derivedName = lines.length > 0 && lines[0].trim() !== '' ? lines[0].trim().substring(0, 30) : "Customer (No Name)";

    // We store the whole block in 'details' and also in 'address' just in case, 
    // or we can leave address/phone blank since they are all in one blob now.
    // For the UI to look good, we'll just put the full blob in 'details'.

    const orderData = {
        customerName: derivedName,
        address: "See Details", // Placeholder
        phone: "See Details",   // Placeholder
        details: fullDetails,   // This now contains everything: Name, Phone, Address, Items
        paymentStatus: document.getElementById('payStatus').value,
        status: 'pending',
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    };

    try {
        await db.orders.add(orderData);
        showToast('Order created successfully!');
        e.target.reset();
        updateDashboardStats();
        // If we are currently viewing workshop, refresh it too
        if (currentTab === 'workshop') renderWorkshopOrders();
    } catch (err) {
        showToast('Error creating order', 'error');
        console.error(err);
    }
});

// --- ADMIN: COMPLETED ORDERS ---
async function openCompletedOrdersModal() {
    const modal = document.getElementById('completedOrdersModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    await renderCompletedOrders();
}

function closeCompletedOrdersModal() {
    const modal = document.getElementById('completedOrdersModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function renderCompletedOrders() {
    // Fetch completed orders
    const completed = await db.orders.where('status').equals('completed').reverse().toArray();
    const container = document.getElementById('completedOrdersList');

    if (completed.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-history text-4xl mb-4"></i>
                <p>No completed orders found.</p>
            </div>`;
        return;
    }

    container.innerHTML = completed.map(o => `
        <div class="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div class="flex justify-between items-start mb-3">
                <h4 class="font-bold text-lg text-gray-800">${o.customerName}</h4>
                <div class="text-right">
                    <span class="block text-xs text-gray-500">${o.date}</span>
                    <span class="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${o.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${o.paymentStatus}
                    </span>
                </div>
            </div>
            <div class="font-mono text-sm text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border border-gray-100">
${o.details}
            </div>
            <div class="mt-3 flex justify-end space-x-2">
                 <button onclick="revertOrder(${o.id})" class="text-sm text-orange-600 hover:text-orange-800 underline">Mark as Pending</button>
            </div>
        </div>
    `).join('');
}

async function revertOrder(id) {
    const result = await Swal.fire({
        title: 'Revert Order?',
        text: "Move this order back to Pending?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f97316',
        confirmButtonText: 'Yes, Revert'
    });

    if (result.isConfirmed) {
        await db.orders.update(id, { status: 'pending' });
        showToast('Order moved back to Pending');
        renderCompletedOrders();
        updateDashboardStats(); // Refresh stats in background
    }
}

// --- ADMIN: EXPENSES ---
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Create a timestamp based date string for sorting/filtering
    const now = new Date();
    // Format YYYY-MM for grouping
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const expenseData = {
        note: document.getElementById('expNote').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        date: now.toLocaleDateString(),
        isoMonth: currentMonth,
        timestamp: Date.now()
    };

    try {
        await db.expenses.add(expenseData);
        showToast('Expense added!');
        e.target.reset();
        renderExpenses();
        updateDashboardStats();
    } catch (err) {
        showToast('Error adding expense', 'error');
    }
});

async function renderExpenses() {
    const exps = await db.expenses.reverse().limit(10).toArray(); // Show last 10
    const container = document.getElementById('expenseList');

    if (exps.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No expenses recorded.</p>';
        return;
    }

    container.innerHTML = exps.map(e => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
            <div class="flex items-center space-x-3">
                <div class="w-2 h-2 rounded-full bg-red-500"></div>
                <div>
                    <p class="font-medium text-gray-800">${e.note}</p>
                    <p class="text-xs text-gray-500">${e.date}</p>
                </div>
            </div>
            <span class="font-bold text-red-600">${formatCurrency(e.amount)}</span>
        </div>
    `).join('');
}


// --- ADMIN: EXPENSE REPORTS ---
async function openExpenseReportModal() {
    const modal = document.getElementById('expenseReportModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    await renderExpenseReports();
}

function closeExpenseReportModal() {
    const modal = document.getElementById('expenseReportModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function renderExpenseReports() {
    // 1. Get all expenses
    const allExpenses = await db.expenses.toArray();

    // 2. Group by isoMonth (YYYY-MM)
    // If old data doesn't have isoMonth, fallback to parsing date string or current date
    const grouped = {};

    allExpenses.forEach(exp => {
        let monthKey = exp.isoMonth;
        if (!monthKey) {
            // Fallback for existing data: try to parse locale date string or use "Unknown"
            // Simple hack for "DD/MM/YYYY" or "M/D/YYYY"
            try {
                const parts = exp.date.split('/');
                if (parts.length === 3) {
                    // Assuming D/M/Y or M/D/Y... Dexie stores "toLocaleDateString" which varies.
                    // Safe bet for this user likely MDY or DMY. Let's just strip the day.
                    // A robust app would store ISO string.
                    // Let's create a rough key based on the stored string or timestamp if available.
                    if (exp.timestamp) {
                        const d = new Date(exp.timestamp);
                        monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    } else {
                        monthKey = "Legacy Data";
                    }
                } else {
                    monthKey = "Legacy Data";
                }
            } catch (e) { monthKey = "Unknown"; }
        }

        if (!grouped[monthKey]) {
            grouped[monthKey] = { total: 0, items: [], count: 0 };
        }
        grouped[monthKey].total += parseFloat(exp.amount || 0);
        grouped[monthKey].count += 1;
        grouped[monthKey].items.push(exp);
    });

    // 3. Render List
    const container = document.getElementById('expenseReportList');
    const sortedMonths = Object.keys(grouped).sort().reverse();

    if (sortedMonths.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400">No expense records found.</p>';
        return;
    }

    container.innerHTML = sortedMonths.map(month => {
        const data = grouped[month];
        // Format month label "2026-02" -> "February 2026"
        let label = month;
        if (month.match(/^\d{4}-\d{2}$/)) {
            const [y, m] = month.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
            label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        return `
        <div class="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-bold text-xl text-gray-800">${label}</h4>
                <div class="text-right">
                    <span class="block text-xl font-bold text-red-600">${formatCurrency(data.total)}</span>
                    <span class="text-xs text-gray-500">${data.count} items</span>
                </div>
            </div>

            <div class="flex justify-end mt-4 pt-3 border-t border-gray-200">
                 <button onclick="printExpenseReport('${month}', '${label}')" class="flex items-center space-x-2 bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-lg text-sm transition">
                    <i class="fas fa-print"></i> <span>Print Summary</span>
                 </button>
            </div>
        </div>
        `;
    }).join('');
}

async function printExpenseReport(monthKey, monthLabel) {
    // Re-fetch or pass data. Fetch is safer.
    const allExpenses = await db.expenses.toArray();

    // Filter logic same as grouping
    const relevantExpenses = allExpenses.filter(exp => {
        let m = exp.isoMonth;
        if (!m && exp.timestamp) {
            const d = new Date(exp.timestamp);
            m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        if (!m) m = "Legacy Data";
        return m === monthKey;
    });

    const total = relevantExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div class="order-card-print">
            <h2 style="text-align:center; margin-bottom: 5px;">AMAZING DECORA</h2>
            <h4 style="text-align:center; margin-top: 0; color: #555;">EXPENSE REPORT: ${monthLabel}</h4>
            <hr style="margin: 15px 0;">

            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="border-bottom: 2px solid #000;">
                        <th style="text-align: left; padding: 5px;">Date</th>
                        <th style="text-align: left; padding: 5px;">Description</th>
                        <th style="text-align: right; padding: 5px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${relevantExpenses.map(e => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 5px;">${e.date}</td>
                            <td style="padding: 5px;">${e.note}</td>
                            <td style="padding: 5px; text-align: right;">${formatCurrency(e.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #000;">
                        <td colspan="2" style="text-align: right; padding: 10px; font-weight: bold;">TOTAL:</td>
                        <td style="text-align: right; padding: 10px; font-weight: bold;">${formatCurrency(total)}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 40px; text-align: center; font-size: 0.8em; color: #777;">
                <p>Printed on ${new Date().toLocaleString()}</p>
            </div>
        </div>
    `;
    window.print();
}

// --- ADMIN: STOCK ---
async function renderStock() {
    const stock = await db.stock.toArray();
    const container = document.getElementById('stockList');

    container.innerHTML = stock.map(s => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-green-200 transition">
            <span class="font-medium text-gray-700">${s.itemSize}</span>
            <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold text-sm">${s.quantity}</span>
        </div>
    `).join('');
}

// --- WORKSHOP: ORDERS ---
async function renderWorkshopOrders() {
    const pending = await db.orders.where('status').equals('pending').reverse().toArray();
    const container = document.getElementById('workshopOrdersList');

    if (pending.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                <i class="fas fa-clipboard-check text-4xl mb-4"></i>
                <p>No pending orders right now.</p>
            </div>`;
        return;
    }

    container.innerHTML = pending.map(o => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-300">
            <div class="p-5">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="font-bold text-xl text-gray-800">${o.customerName}</h3>
                        <div class="flex items-center text-sm text-gray-500 mt-1">
                            <i class="fas fa-phone-alt mr-2 text-xs"></i> <span>${o.phone}</span>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-bold ${o.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${o.paymentStatus === 'Paid' ? 'PAID' : 'NOT PAID'}
                    </span>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg mb-4 text-blue-900 font-mono text-sm whitespace-pre-wrap border-l-4 border-blue-400 leading-relaxed">
${o.details}
                </div>
                
                <div class="text-sm text-gray-600 mb-4">
                    <p class="flex items-start"><i class="fas fa-map-marker-alt mt-1 mr-2 text-gray-400"></i> ${o.address}</p>
                </div>

                <div class="flex space-x-3 pt-3 border-t border-gray-100">
                    <button onclick="printOrder(${o.id})" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition flex items-center justify-center space-x-2">
                        <i class="fas fa-print"></i> <span>Print</span>
                    </button>
                    <button onclick="completeOrder(${o.id})" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition flex items-center justify-center space-x-2">
                        <i class="fas fa-check"></i> <span>Complete</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function completeOrder(id) {
    const order = await db.orders.get(id);

    const result = await Swal.fire({
        title: 'Complete Order?',
        text: "This will deduct items from stock and mark order as completed.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Complete & Deduct Stock'
    });

    if (result.isConfirmed) {
        // 1. Deduct Stock
        const deductions = await parseAndDeductStock(order.details);

        // 2. Mark as Completed
        await db.orders.update(id, { status: 'completed' });

        // 3. Feedback
        if (deductions.length > 0) {
            const deductionMsg = deductions.map(d => `${d.qty}x ${d.item}`).join('<br>');
            await Swal.fire({
                title: 'Order Completed',
                html: `Stock updated:<br><small>${deductionMsg}</small>`,
                icon: 'success',
                timer: 4000
            });
        } else {
            showToast('Order completed (No matching stock items found to deduct)', 'warning');
        }

        renderWorkshopOrders();
    }
}

async function parseAndDeductStock(detailsText) {
    const lines = detailsText.split('\n');
    const allStock = await db.stock.toArray();
    // Sort stock items by length desc to match longest names first
    allStock.sort((a, b) => b.itemSize.length - a.itemSize.length);

    const deductions = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Extract Quantity: Look for leading number. Default to 1.
        // e.g. "2 x Item", "2 Item", "Item"
        let qty = 1;
        let cleanLine = line;

        const qtyMatch = line.match(/^(\d+)\s*[xX*]?\s*/);
        if (qtyMatch) {
            qty = parseInt(qtyMatch[1]);
            cleanLine = line.substring(qtyMatch[0].length).trim();
        }

        // Try to match 'cleanLine' with a stock item
        // We look for the stock item name inside the line (case insensitive)
        const matchedItem = allStock.find(stockItem => {
            return cleanLine.toLowerCase().includes(stockItem.itemSize.toLowerCase()) ||
                stockItem.itemSize.toLowerCase().includes(cleanLine.toLowerCase());
        });

        if (matchedItem) {
            // Deduct from DB
            const newQty = Math.max(0, matchedItem.quantity - qty);
            await db.stock.update(matchedItem.itemSize, { quantity: newQty });

            // Update local array to prevent double counting if multiple lines match same item? 
            // For now, let's assume lines are distinct or cumulative.
            matchedItem.quantity = newQty;

            deductions.push({ item: matchedItem.itemSize, qty: qty });
        }
    }
    return deductions;
}

async function printOrder(id) {
    const o = await db.orders.get(id);
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div class="order-card-print">
            <h2 style="text-align:center; margin-bottom: 5px;">AMAZING DECORA</h2>
            <h4 style="text-align:center; margin-top: 0; color: #555;">JOB SLIP / ORDER RECEIPT</h4>
            <hr style="margin: 15px 0;">
            <div style="display: flex; justify-content: space-between;">
                <div>
                    <p><b>Date:</b> ${new Date().toLocaleDateString()}</p>
                    <p><b>Order ID:</b> #${o.id}</p>
                </div>
                <div>
                    <p style="text-align: right; font-weight: bold; font-size: 1.2em;">${o.paymentStatus === 'Paid' ? 'PAID' : 'NOT PAID'}</p>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <p><b>Customer:</b> ${o.customerName}</p>
                <p><b>Phone:</b> ${o.phone}</p>
                <p><b>Address:</b> ${o.address}</p>
            </div>
            
            <div style="border: 2px solid #000; padding: 15px; margin-top: 20px; font-family: monospace; font-size: 1.1em; background: #eee;">
                <b>ORDER DETAILS:</b><br/>${o.details.replace(/\n/g, '<br>')}
            </div>
            
            <div style="margin-top: 40px; text-align: center; font-size: 0.8em; color: #777;">
                <p>Thank you for choosing Amazing Decora!</p>
            </div>
        </div>
    `;
    window.print();
}

// --- WORKSHOP: PRODUCTION ---
function openProductionModal() {
    const modal = document.getElementById('productionModal');
    const container = document.getElementById('prodInputs');

    container.innerHTML = initialSizes.map(s => `
        <div class="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <label class="block text-xs font-bold text-orange-800 uppercase mb-2 tracking-wide">${s}</label>
            <input type="number" data-size="${s}" value="0" min="0" class="prod-qty w-full p-2 border border-orange-200 rounded-lg text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
        </div>
    `).join('');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeProductionModal() {
    const modal = document.getElementById('productionModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

document.getElementById('prodEntryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = document.querySelectorAll('.prod-qty');
    let hasUpdates = false;

    for (let input of inputs) {
        const qty = parseInt(input.value);
        if (qty > 0) {
            hasUpdates = true;
            const item = await db.stock.get(input.dataset.size);
            if (item) {
                await db.stock.update(input.dataset.size, { quantity: item.quantity + qty });
            }
        }
    }

    if (hasUpdates) {
        showToast('Stock updated successfully!');
        closeProductionModal();
        // If we are on admin tab, we might want to refresh stock. 
        // But usually this is done from Workshop. 
        // If admin is open in background, it will update next time tab switches or reloads.
    } else {
        showToast('No quantities entered', 'info');
    }
});
