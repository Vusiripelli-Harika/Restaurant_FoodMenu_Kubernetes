const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = 3067;

// MongoDB connection setup
mongoose.connect('mongodb://db:27017/foodOrderDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define the schema for orders
const orderSchema = new mongoose.Schema({
    tableNumber: Number,
    starters: [String],
    mainCourse: [String],
    softDrinks: [String],
    quantities: Map,
    instructions: String,
    status: { type: String, default: 'occupied' } // Field to track the table status
});

// Create the Order model
const Order = mongoose.model('Order', orderSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the 'public' directory

// Middleware to check table availability
async function checkTableAvailability(req, res, next) {
    try {
        const tableNumber = parseInt(req.body.tableNumber, 10);
        const existingOrder = await Order.findOne({ tableNumber: tableNumber, status: 'occupied' });
        if (existingOrder) {
            // Serve an error page with an image
            return res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Table Occupied</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background-color: #f8d7da;
                            color: #721c24;
                            text-align: center;
                        }
                        img {
                            max-width: 50%;
                            height: auto;
                        }
                        .message {
                            font-size: 1.5em;
                            margin-top: 20px;
                        }
                        button {
                            margin-top: 20px;
                            padding: 10px 20px;
                            font-size: 16px;
                            cursor: pointer;
                            background-color: #4CAF50;
                            color: white;
                            border: none;
                            border-radius: 5px;
                        }
                        button:hover {
                            background-color: #45a049;
                        }
                    </style>
                </head>
                <body>
                    <img src="images/img15.jpg" alt="Error">
                    <div class="message">Table is already occupied. Please choose another table.</div>
                    <form action="/menu.html" method="get">
                        <button type="submit">Choose Another Table</button>
                    </form>
                </body>
                </html>
            `);
        }
        next();
    } catch (error) {
        console.error('Error checking table availability:', error);
        res.status(500).send('Internal Server Error');
    }
}

// Route to handle new order submission
app.post('/submit_order', checkTableAvailability, async (req, res) => {
    try {
        const data = req.body;

        // Extract quantities from the form data
        const quantities = {};
        for (let key in data) {
            if (key.endsWith('Quantity')) {
                quantities[key] = parseInt(data[key], 10);
            }
        }

        // Create a new order document
        const newOrder = new Order({
            tableNumber: data.tableNumber,
            starters: data.starters || [],
            mainCourse: data.mainCourse || [],
            softDrinks: data.softDrinks || [],
            quantities,
            instructions: data.instructions,
            status: 'occupied' // Set status to occupied
        });

        // Save the order to the database
        const savedOrder = await newOrder.save();

        // Respond with the success page containing Update and Delete buttons
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Success</title>
                <style>
                    img {
                        margin-top: 50px;
                        max-width: 50%;
                        height: 50%;
                    }
                    button {
                        margin-top: 20px;
                        padding: 10px 20px;
                        font-size: 16px;
                        cursor: pointer;
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 5px;
                    }
                    button:hover {
                        background-color: #45a049;
                    }
                    .buttons {
                        margin-top: 30px;
                    }
                    .delete-form {
                        margin-top: 30px;
                    }
                    .delete-form input {
                        padding: 10px;
                        font-size: 16px;
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <center>
                    <img src="images/img.png" alt="Order Confirmed">
                    <div class="buttons">
                        <form action="/redirect_update/${savedOrder._id}" method="get">
                            <button type="submit">Update</button>
                        </form>
                        <div class="delete-form">
                            <form action="/delete_order_by_id" method="post">
                                <input type="text" name="orderId" placeholder="Enter Order ID" required>
                                <button type="submit">Delete</button>
                            </form>
                        </div>
                        <form action="/index.html" method="get">
                            <button type="submit">Go Back to Home Page</button>
                        </form>
                    </div>
                </center>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error saving the order:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle updating the order
app.post('/update_order/:id', async (req, res) => {
    try {
        const data = req.body;

        // Extract quantities from the form data
        const quantities = {};
        for (let key in data) {
            if (key.endsWith('Quantity')) {
                quantities[key] = parseInt(data[key], 10);
            }
        }

        // Update the order in the database
        await Order.findByIdAndUpdate(req.params.id, {
            tableNumber: data.tableNumber,
            starters: data.starters || [],
            mainCourse: data.mainCourse || [],
            softDrinks: data.softDrinks || [],
            quantities,
            instructions: data.instructions
        });

        res.redirect('/index.html?update=success'); // Redirect to index.html after update
    } catch (error) {
        console.error('Error updating the order:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle deleting the order by ID from the form input
app.post('/delete_order_by_id', async (req, res) => {
    try {
        const { orderId } = req.body;
        
        // Check if the order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Update status and delete the order
        await Order.findByIdAndUpdate(orderId, { status: 'available' }); // Update status to available
        await Order.findByIdAndDelete(orderId);

        // Redirect to the menu page after deletion
        res.redirect('/index.html?delete=success');
    } catch (error) {
        console.error('Error deleting the order:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to fetch order data
app.get('/order/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send('Order not found');
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle redirect for updating order
app.get('/redirect_update/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send('Order not found');

        res.redirect(`/menu.html?id=${order._id}`);
    } catch (error) {
        console.error('Error redirecting for update:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle redirect for deleting order
app.get('/redirect_delete/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).send('Order not found');

        res.redirect(`/menu.html?id=${order._id}&delete=true`);
    } catch (error) {
        console.error('Error redirecting for delete:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
