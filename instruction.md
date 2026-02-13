# Amazing Decora POS System - Source Code

Save the following code as `index.html`. You can run this directly in any modern web browser.

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazing Decora POS</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
    <style>
        @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .order-card { border: 1px solid #000; padding: 20px; margin-bottom: 20px; }
        }
        .print-only { display: none; }
    </style>
</head>
<body class="bg-gray-100 font-sans">

    <nav class="bg-green-700 text-white p-4 shadow-lg no-print">
        <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold tracking-tight">AMAZING DECORA</h1>
            <div class="space-x-4">
                <button onclick="switchTab('admin')" class="px-4 py-2 hover:bg-green-600 rounded transition">Admin Interface</button>
                <button onclick="switchTab('workshop')" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition">Workshop (සිංහල)</button>
            </div>
        </div>
    </nav>

    <div id="admin-tab" class="container mx-auto p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-bold mb-4 border-b pb-2 text-green-700">Add New Order</h2>
                <form id="orderForm" class="space-y-4">
                    <input type="text" id="custName" placeholder="Customer Name" class="w-full p-2 border rounded" required>
                    <textarea id="custAddress" placeholder="Address" class="w-full p-2 border rounded" required></textarea>
                    <input type="text" id="custPhone" placeholder="Phone Number" class="w-full p-2 border rounded" required>
                    <textarea id="orderDetails" placeholder="Order Details (e.g. 2 x 1.5ft Wood Pole)" class="w-full p-2 border rounded" required></textarea>
                    <select id="payStatus" class="w-full p-2 border rounded">
                        <option value="Paid">Paid (මුදල් ගෙවා ඇත)</option>
                        <option value="Not Paid">Not Paid (මුදල් ගෙවා නැත)</option>
                    </select>
                    <button type="submit" class="w-full bg-green-700 text-white py-2 rounded font-bold hover:bg-green-800 transition">Send to Workshop</button>
                </form>
            </div>

            <div class="space-y-6">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-bold mb-4 border-b pb-2 text-red-700">Expenses</h2>
                    <form id="expenseForm" class="flex space-x-2">
                        <input type="text" id="expNote" placeholder="Item/Tool name" class="flex-1 p-2 border rounded">
                        <input type="number" id="expAmount" placeholder="Amount" class="w-24 p-2 border rounded">
                        <button type="submit" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Add</button>
                    </form>
                    <div id="expenseList" class="mt-4 max-h-40 overflow-y-auto text-sm"></div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-xl font-bold mb-4 border-b pb-2 text-blue-700">Current Stock Inventory</h2>
                    <div id="stockList" class="grid grid-cols-2 gap-2 text-sm">
                        </div>
                </div>
            </div>
        </div>
    </div>

    <div id="workshop-tab" class="container mx-auto p-6 hidden no-print">
        <div class="flex flex-col items-center space-y-8">
            <h1 class="text-3xl font-bold text-gray-800 uppercase tracking-widest">කර්මාන්තශාලා අතුරුමුහුණත</h1>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <button onclick="showWorkshopOrders()" class="bg-blue-600 text-white p-12 rounded-2xl shadow-2xl hover:bg-blue-700 transition transform hover:scale-105">
                    <span class="text-4xl block mb-2">📋</span>
                    <span class="text-3xl font-bold">අලුත් ඕඩර්ස්</span>
                </button>

                <button onclick="showProductionForm()" class="bg-orange-500 text-white p-12 rounded-2xl shadow-2xl hover:bg-orange-600 transition transform hover:scale-105">
                    <span class="text-4xl block mb-2">🛠️</span>
                    <span class="text-3xl font-bold">අද නිශ්පාදනය කල දේවල්</span>
                </button>
            </div>
        </div>
    </div>

    <div id="ordersModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex justify-center items-center p-4 no-print">
        <div class="bg-white w-full max-w-3xl rounded-lg p-6 max-h-screen overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold">පවතින ඇණවුම් (Pending Orders)</h2>
                <button onclick="closeModal('ordersModal')" class="text-red-500 text-3xl font-bold">&times;</button>
            </div>
            <div id="workshopOrdersList" class="space-y-4"></div>
        </div>
    </div>

    <div id="productionModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex justify-center items-center p-4 no-print">
        <div class="bg-white w-full max-w-4xl rounded-lg p-6 max-h-screen overflow-y-auto">
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <h2 class="text-2xl font-bold">දෛනික නිශ්පාදනය ඇතුලත් කරන්න</h2>
                <button onclick="closeModal('productionModal')" class="text-red-500 text-3xl font-bold">&times;</button>
            </div>
            <form id="prodEntryForm" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="prodInputs" class="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4"></div>
                <button type="submit" class="col-span-2 bg-orange-600 text-white py-4 rounded-xl font-bold text-xl mt-4">දත්ත සුරකින්න (Save Data)</button>
            </form>
        </div>
    </div>

    <div id="printArea" class="print-only"></div>

    <script>
        // --- DATABASE SETUP ---
        const db = new Dexie("AmazingDecoraDB");
        db.version(1).stores({
            orders: '++id, customerName, status',
            expenses: '++id, date',
            stock: 'itemSize, quantity'
        });

        // Initialize Stock Categories
        const sizes = [
            "Wood Pole 1.5ft", "Wood Pole 2.0ft", "Wood Pole 2.5ft", "Wood Pole 3.0ft", "Wood Pole 3.5ft", "Wood Pole 4.0ft",
            "PVC Pole 1.5ft", "PVC Pole 2.0ft", "PVC Pole 2.5ft", "PVC Pole 3.0ft", "PVC Pole 3.5ft", "PVC Pole 4.0ft",
            "Ladder 3.0ft", "Ladder 4.0ft",
            "Coir Pot Size 1", "Coir Pot Size 2", "Coir Pot Size 3",
            "Orchid Support 12x12", "Orchid Support 12x14"
        ];

        async function initStock() {
            for (let s of sizes) {
                const exists = await db.stock.get(s);
                if (!exists) await db.stock.add({ itemSize: s, quantity: 0 });
            }
            renderStock();
        }
        initStock();

        // --- UI LOGIC ---
        function switchTab(tab) {
            document.getElementById('admin-tab').classList.toggle('hidden', tab !== 'admin');
            document.getElementById('workshop-tab').classList.toggle('hidden', tab !== 'workshop');
        }

        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

        // --- ADMIN FUNCTIONS ---
        document.getElementById('orderForm').onsubmit = async (e) => {
            e.preventDefault();
            await db.orders.add({
                customerName: document.getElementById('custName').value,
                address: document.getElementById('custAddress').value,
                phone: document.getElementById('custPhone').value,
                details: document.getElementById('orderDetails').value,
                paymentStatus: document.getElementById('payStatus').value,
                status: 'pending',
                date: new Date().toLocaleDateString()
            });
            alert("Order sent to workshop!");
            e.target.reset();
        };

        document.getElementById('expenseForm').onsubmit = async (e) => {
            e.preventDefault();
            await db.expenses.add({
                note: document.getElementById('expNote').value,
                amount: document.getElementById('expAmount').value,
                date: new Date().toLocaleDateString()
            });
            renderExpenses();
            e.target.reset();
        };

        async function renderExpenses() {
            const exps = await db.expenses.reverse().toArray();
            document.getElementById('expenseList').innerHTML = exps.map(e => `
                <div class="flex justify-between py-1 border-b">
                    <span>${e.date} - ${e.note}</span>
                    <span class="font-bold text-red-600">Rs. ${e.amount}</span>
                </div>
            `).join('');
        }
        renderExpenses();

        async function renderStock() {
            const stock = await db.stock.toArray();
            document.getElementById('stockList').innerHTML = stock.map(s => `
                <div class="p-2 bg-gray-50 border rounded flex justify-between">
                    <span>${s.itemSize}:</span>
                    <span class="font-bold text-green-700">${s.quantity}</span>
                </div>
            `).join('');
        }

        // --- WORKSHOP FUNCTIONS ---
        async function showWorkshopOrders() {
            const pending = await db.orders.where('status').equals('pending').toArray();
            document.getElementById('ordersModal').classList.remove('hidden');
            document.getElementById('workshopOrdersList').innerHTML = pending.length ? pending.map(o => `
                <div class="border-2 border-blue-200 p-4 rounded-lg bg-blue-50">
                    <div class="flex justify-between">
                        <h3 class="font-bold text-xl">${o.customerName}</h3>
                        <span class="px-2 py-1 bg-white border rounded font-bold ${o.paymentStatus === 'Paid' ? 'text-green-600' : 'text-red-600'}">
                            ${o.paymentStatus === 'Paid' ? 'මුදල් ගෙවා ඇත' : 'මුදල් ගෙවා නැත'}
                        </span>
                    </div>
                    <p class="mt-2"><b>ලිපිනය:</b> ${o.address}</p>
                    <p><b>දුරකථන:</b> ${o.phone}</p>
                    <div class="bg-white p-3 my-2 border-l-4 border-blue-500 font-mono text-lg whitespace-pre-wrap">${o.details}</div>
                    <div class="flex space-x-2 mt-4 no-print">
                        <button onclick="printOrder(${o.id})" class="bg-gray-700 text-white px-4 py-2 rounded">ප්‍රින්ට් කරන්න (Print)</button>
                        <button onclick="completeOrder(${o.id})" class="bg-green-600 text-white px-4 py-2 rounded">වැඩ අවසන් (Done)</button>
                    </div>
                </div>
            `).join('') : '<p class="text-center py-10 text-gray-400">නව ඇණවුම් නොමැත.</p>';
        }

        async function printOrder(id) {
            const o = await db.orders.get(id);
            const printArea = document.getElementById('printArea');
            printArea.innerHTML = `
                <div class="order-card">
                    <h1 style="text-align:center">AMAZING DECORA - JOB SLIP</h1>
                    <hr>
                    <p><b>Customer:</b> ${o.customerName}</p>
                    <p><b>Phone:</b> ${o.phone}</p>
                    <p><b>Address:</b> ${o.address}</p>
                    <p><b>Payment:</b> ${o.paymentStatus === 'Paid' ? 'Paid (මුදල් ගෙවා ඇත)' : 'Not Paid (මුදල් ගෙවා නැත)'}</p>
                    <div style="border:1px solid #ccc; padding:10px; margin-top:10px;">
                        <b>ORDER DETAILS:</b><br>${o.details.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
            window.print();
        }

        async function completeOrder(id) {
            await db.orders.update(id, { status: 'completed' });
            showWorkshopOrders();
        }

        function showProductionForm() {
            document.getElementById('productionModal').classList.remove('hidden');
            document.getElementById('prodInputs').innerHTML = sizes.map(s => `
                <div class="flex flex-col p-2 bg-orange-50 rounded">
                    <label class="text-sm font-bold text-orange-800">${s}</label>
                    <input type="number" data-size="${s}" value="0" min="0" class="prod-qty p-2 border border-orange-200 rounded text-xl">
                </div>
            `).join('');
        }

        document.getElementById('prodEntryForm').onsubmit = async (e) => {
            e.preventDefault();
            const inputs = document.querySelectorAll('.prod-qty');
            for (let input of inputs) {
                const qty = parseInt(input.value);
                if (qty > 0) {
                    const item = await db.stock.get(input.dataset.size);
                    await db.stock.update(input.dataset.size, { quantity: item.quantity + qty });
                }
            }
            alert("නිශ්පාදන දත්ත ඇතුලත් කරන ලදී!");
            closeModal('productionModal');
            renderStock();
        };

    </script>
</body>
</html>