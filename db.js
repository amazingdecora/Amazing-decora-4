const db = new Dexie("AmazingDecoraDB_v2");

db.version(1).stores({
    orders: '++id, customerName, status, date',
    expenses: '++id, date',
    stock: 'itemSize, quantity'
});

// Initial Stock Data
const initialSizes = [
    "Wood Pole 1.5ft", "Wood Pole 2.0ft", "Wood Pole 2.5ft", "Wood Pole 3.0ft", "Wood Pole 3.5ft", "Wood Pole 4.0ft",
    "PVC Pole 1.5ft", "PVC Pole 2.0ft", "PVC Pole 2.5ft", "PVC Pole 3.0ft", "PVC Pole 3.5ft", "PVC Pole 4.0ft",
    "Ladder 3.0ft", "Ladder 4.0ft",
    "Coir Pot Size 1", "Coir Pot Size 2", "Coir Pot Size 3",
    "Orchid Support 12x12", "Orchid Support 12x14"
];

async function initDatabase() {
    for (let s of initialSizes) {
        const exists = await db.stock.get(s);
        if (!exists) {
            await db.stock.add({ itemSize: s, quantity: 0 });
        }
    }
    console.log("Database initialized with stock items.");
}
