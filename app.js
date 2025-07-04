// ========================================
// FIREBASE CONFIGURATION
// ========================================
// REPLACE THIS WITH YOUR FIREBASE CONFIG FROM STEP 9
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ========================================
// GLOBAL VARIABLES
// ========================================
let currentUser = null;
let currentOrder = [];
let menuItems = [];
let orders = [];
let inventory = [];
let staff = [];

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================
function showLogin() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('registerScreen').classList.remove('active');
}

function showRegister() {
    document.getElementById('registerScreen').classList.add('active');
    document.getElementById('loginScreen').classList.remove('active');
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUser = { uid: user.uid, ...userDoc.data() };
            showDashboard();
        } else {
            alert('User profile not found. Please contact admin.');
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
    }
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    
    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: new Date(),
            active: true
        });
        
        currentUser = { uid: user.uid, name, email, role };
        showDashboard();
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        document.getElementById('dashboard').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
    });
}

function showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('dashboard').classList.add('active');
    
    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
    
    // Load initial data
    loadMenuItems();
    loadOrders();
    loadInventory();
    loadStaff();
    updateAnalytics();
}

// ========================================
// NAVIGATION FUNCTIONS
// ========================================
function showModule(moduleName) {
    // Hide all modules
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected module
    document.getElementById(moduleName + 'Module').classList.add('active');
    
    // Add active class to clicked nav item
    event.target.classList.add('active');
}

// ========================================
// MENU FUNCTIONS
// ========================================
async function loadMenuItems() {
    try {
        const snapshot = await db.collection('menu').get();
        menuItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If no menu items exist, create default ones
        if (menuItems.length === 0) {
            await createDefaultMenu();
            return loadMenuItems();
        }
        
        displayMenuItems();
    } catch (error) {
        console.error('Error loading menu items:', error);
    }
}

async function createDefaultMenu() {
    const defaultItems = [
        { name: 'Burger', price: 12.99, category: 'Main', image: '🍔' },
        { name: 'Pizza', price: 15.99, category: 'Main', image: '🍕' },
        { name: 'Pasta', price: 11.99, category: 'Main', image: '🍝' },
        { name: 'Salad', price: 8.99, category: 'Starter', image: '🥗' },
        { name: 'Coffee', price: 4.99, category: 'Drinks', image: '☕' },
        { name: 'Soda', price: 2.99, category: 'Drinks', image: '🥤' },
        { name: 'Ice Cream', price: 5.99, category: 'Dessert', image: '🍦' },
        { name: 'Cake', price: 6.99, category: 'Dessert', image: '🍰' }
    ];
    
    for (const item of defaultItems) {
        await db.collection('menu').add(item);
    }
}

function displayMenuItems() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    menuItems.forEach(item => {
        const menuItemDiv = document.createElement('div');
        menuItemDiv.className = 'menu-item';
        menuItemDiv.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 5px;">${item.image}</div>
            <h4>${item.name}</h4>
            <p>$${item.price.toFixed(2)}</p>
        `;
        menuItemDiv.onclick = () => addToOrder(item);
        menuGrid.appendChild(menuItemDiv);
    });
}

function addToOrder(item) {
    const existingItem = currentOrder.find(orderItem => orderItem.id === item.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        currentOrder.push({ ...item, quantity: 1 });
    }
    
    updateOrderDisplay();
}

function updateOrderDisplay() {
    const orderContainer = document.getElementById('currentOrder');
    const totalElement = document.getElementById('orderTotal');
    
    orderContainer.innerHTML = '';
    let total = 0;
    
    currentOrder.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const orderItemDiv = document.createElement('div');
        orderItemDiv.className = 'order-item';
        orderItemDiv.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>${item.price.toFixed(2)} x ${item.quantity}</small>
            </div>
            <div>
                <button onclick="changeQuantity(${index}, -1)">-</button>
                <span style="margin: 0 10px;">${item.quantity}</span>
                <button onclick="changeQuantity(${index}, 1)">+</button>
                <button onclick="removeFromOrder(${index})" style="margin-left: 10px; background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px;">Remove</button>
            </div>
        `;
        orderContainer.appendChild(orderItemDiv);
    });
    
    totalElement.textContent = total.toFixed(2);
}

function changeQuantity(index, change) {
    currentOrder[index].quantity += change;
    if (currentOrder[index].quantity <= 0) {
        currentOrder.splice(index, 1);
    }
    updateOrderDisplay();
}

function removeFromOrder(index) {
    currentOrder.splice(index, 1);
    updateOrderDisplay();
}

async function processPayment() {
    if (currentOrder.length === 0) {
        alert('No items in order');
        return;
    }
    
    const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    try {
        // Create new order
        const orderData = {
            items: currentOrder,
            total: total,
            status: 'pending',
            createdAt: new Date(),
            createdBy: currentUser.uid,
            customerName: prompt('Customer Name:') || 'Walk-in Customer'
        };
        
        await db.collection('orders').add(orderData);
        
        alert('Order processed successfully!');
        currentOrder = [];
        updateOrderDisplay();
        loadOrders();
        updateAnalytics();
    } catch (error) {
        alert('Error processing order: ' + error.message);
    }
}

// ========================================
// ORDERS FUNCTIONS
// ========================================
async function loadOrders() {
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(filter = 'all') {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';
    
    let filteredOrders = orders;
    if (filter !== 'all') {
        filteredOrders = orders.filter(order => order.status === filter);
    }
    
    filteredOrders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        orderDiv.innerHTML = `
            <h4>Order #${order.id.slice(-6)}</h4>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
            <p><strong>Status:</strong> <span class="order-status status-${order.status}">${order.status}</span></p>
            <p><strong>Time:</strong> ${new Date(order.createdAt.seconds * 1000).toLocaleString()}</p>
            <div style="margin-top: 10px;">
                <button onclick="updateOrderStatus('${order.id}', 'preparing')" style="background: #28a745; color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 3px;">Prepare</button>
                <button onclick="updateOrderStatus('${order.id}', 'ready')" style="background: #007bff; color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 3px;">Ready</button>
                <button onclick="updateOrderStatus('${order.id}', 'delivered')" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 3px;">Delivered</button>
            </div>
        `;
        ordersList.appendChild(orderDiv);
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: new Date()
        });
        loadOrders();
    } catch (error) {
        alert('Error updating order status: ' + error.message);
    }
}

function filterOrders(status) {
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    displayOrders(status);
}

// ========================================
// INVENTORY FUNCTIONS
// ========================================
async function loadInventory() {
    try {
        const snapshot = await db.collection('inventory').get();
        inventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If no inventory exists, create default items
        if (inventory.length === 0) {
            await createDefaultInventory();
            return loadInventory();
        }
        
        displayInventory();
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

async function createDefaultInventory() {
    const defaultItems = [
        { name: 'Beef Patties', currentStock: 50, minStock: 20, unit: 'pieces', category: 'Meat' },
        { name: 'Burger Buns', currentStock: 100, minStock: 30, unit: 'pieces', category: 'Bread' },
        { name: 'Cheese Slices', currentStock: 80, minStock: 25, unit: 'pieces', category: 'Dairy' },
        { name: 'Tomatoes', currentStock: 30, minStock: 10, unit: 'pieces', category: 'Vegetables' },
        { name: 'Lettuce', currentStock: 25, minStock: 8, unit: 'heads', category: 'Vegetables' },
        { name: 'Coffee Beans', currentStock: 15, minStock: 5, unit: 'kg', category: 'Beverages' },
        { name: 'Milk', currentStock: 20, minStock: 10, unit: 'liters', category: 'Dairy' },
        { name: 'Ice Cream', currentStock: 40, minStock: 15, unit: 'scoops', category: 'Dessert' }
    ];
    
    for (const item of defaultItems) {
        await db.collection('inventory').add(item);
    }
}

function displayInventory() {
    const inventoryList = document.getElementById('inventoryList');
    inventoryList.innerHTML = '';
    
    inventory.forEach(item => {
        const stockLevel = item.currentStock <= item.minStock ? 'low' : 
                          item.currentStock <= item.minStock * 2 ? 'medium' : 'high';
        
        const inventoryDiv = document.createElement('div');
        inventoryDiv.className = 'inventory-item';
        inventoryDiv.innerHTML = `
            <h4>${item.name}</h4>
            <p>Category: ${item.category}</p>
            <div class="stock-level stock-${stockLevel}">
                ${item.currentStock} ${item.unit}
            </div>
            <p>Min Stock: ${item.minStock} ${item.unit}</p>
            <div style="margin-top: 10px;">
                <button onclick="updateStock('${item.id}', 10)" style="background: #28a745; color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 3px;">+10</button>
                <button onclick="updateStock('${item.id}', -10)" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px;">-10</button>
            </div>
        `;
        inventoryList.appendChild(inventoryDiv);
    });
}

async function updateStock(itemId, change) {
    try {
        const item = inventory.find(inv => inv.id === itemId);
        const newStock = Math.max(0, item.currentStock + change);
        
        await db.collection('inventory').doc(itemId).update({
            currentStock: newStock,
            updatedAt: new Date()
        });
        
        loadInventory();
    } catch (error) {
        alert('Error updating stock: ' + error.message);
    }
}

async function addInventoryItem() {
    const name = prompt('Item Name:');
    const currentStock = parseInt(prompt('Current Stock:'));
    const minStock = parseInt(prompt('Minimum Stock:'));
    const unit = prompt('Unit (e.g., pieces, kg, liters):');
    const category = prompt('Category:');
    
    if (!name || !currentStock || !minStock || !unit || !category) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        await db.collection('inventory').add({
            name,
            currentStock,
            minStock,
            unit,
            category,
            createdAt: new Date()
        });
        
        loadInventory();
    } catch (error) {
        alert('Error adding inventory item: ' + error.message);
    }
}

// ========================================
// STAFF FUNCTIONS
// ========================================
async function loadStaff() {
    try {
        const snapshot = await db.collection('users').get();
        staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayStaff();
    } catch (error) {
        console.error('Error loading staff:', error);
    }
}

function displayStaff() {
    const staffList = document.getElementById('staffList');
    const totalStaffElement = document.getElementById('totalStaff');
    const activeStaffElement = document.getElementById('activeStaff');
    
    staffList.innerHTML = '';
    
    let activeCount = 0;
    
    staff.forEach(member => {
        if (member.active) activeCount++;
        
        const staffDiv = document.createElement('div');
        staffDiv.className = 'staff-card';
        staffDiv.innerHTML = `
            <div class="staff-avatar">
                ${member.name.charAt(0).toUpperCase()}
            </div>
            <div class="staff-info">
                <h4>${member.name}</h4>
                <p>${member.role}</p>
                <p>${member.email}</p>
                <p>Status: ${member.active ? 'Active' : 'Inactive'}</p>
            </div>
        `;
        staffList.appendChild(staffDiv);
    });
    
    totalStaffElement.textContent = staff.length;
    activeStaffElement.textContent = activeCount;
}

// ========================================
// ANALYTICS FUNCTIONS
// ========================================
async function updateAnalytics() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt.seconds * 1000);
            return orderDate >= today;
        });
        
        const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
        const avgOrder = todayOrders.length > 0 ? todaySales / todayOrders.length : 0;
        
        // Find most popular item
        const itemCounts = {};
        todayOrders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });
        
        const popularItem = Object.keys(itemCounts).reduce((a, b) => 
            itemCounts[a] > itemCounts[b] ? a : b, '-'
        );
        
        document.getElementById('todaySales').textContent = `${todaySales.toFixed(2)}`;
        document.getElementById('todayOrders').textContent = todayOrders.length;
        document.getElementById('avgOrder').textContent = `${avgOrder.toFixed(2)}`;
        document.getElementById('popularItem').textContent = popularItem;
        
    } catch (error) {
        console.error('Error updating analytics:', error);
    }
}

// ========================================
// INITIALIZATION
// ========================================
// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUser = { uid: user.uid, ...userDoc.data() };
                showDashboard();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
});

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Vozz OS initialized');
});
