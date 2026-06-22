const express = require('express');
const cors = require('cors'); 
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // Added ObjectId structural import

dotenv.config();

const uri = process.env.MONGO_URI;
const port = process.env.PORT || 7000;
const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json()); 

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db, ticketsCollection;

// Establish persistent MongoDB Connection Pool
async function connectDB() {
  try {
    await client.connect();
    db = client.db("TicketBariDB"); 
    ticketsCollection = db.collection("tickets"); 
    console.log("Successfully connected and initialized MongoDB connection node!");
  } catch (error) {
    console.error("Database connection fault:", error);
    process.exit(1);
  }
}
connectDB();

// --- API ENDPOINTS ---

// 1. Base Welcome Route
app.get('/', (req, res) => {
  res.send('TicketBari Backend Server Operational Instance.');
});

// 2. POST Route: Insert a newly submitted vendor ticket (Defaults to Pending)
app.post('/api/tickets', async (req, res) => {
  try {
    const ticketPayload = req.body;

    if (!ticketPayload.title || !ticketPayload.from || !ticketPayload.to || !ticketPayload.vendorEmail) {
      return res.status(400).json({ error: "Missing required core ticket attributes." });
    }

    const result = await ticketsCollection.insertOne({
      ...ticketPayload,
      status: "pending", // ⚠️ Workflow requirement: Auto-sets to pending upon creation
      createdAt: new Date() 
    });

    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (err) {
    console.error("Failed writing ticket document string node:", err);
    res.status(500).json({ error: "Internal Server database write failure." });
  }
});

// 3. GET Route: Fetch tickets posted specifically by the logged-in vendor
app.get('/api/tickets/vendor', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Vendor tracking identifier query email parameter missing." });
    }

    const vendorTickets = await ticketsCollection.find({ vendorEmail: email }).sort({ createdAt: -1 }).toArray();
    res.status(200).json(vendorTickets);
  } catch (err) {
    console.error("Failed fetching vendor collection:", err);
    res.status(500).json({ error: "Internal server read exception." });
  }
});

// 4. GET Route: Fetch ALL tickets for the Admin Management Panel View
app.get('/api/tickets/admin', async (req, res) => {
  try {
    const allTickets = await ticketsCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json(allTickets);
  } catch (err) {
    console.error("Failed administrative collection query fetch execution:", err);
    res.status(500).json({ error: "Internal server read exception." });
  }
});

// 5. PATCH Route: Admin Approve or Reject mutation endpoint matrix
app.patch('/api/tickets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expects values: "Approved" or "Rejected"

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid structural configuration update tag status payload value match context." });
    }

    const result = await ticketsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Target data cluster block matching criteria reference point not found." });
    }

    res.status(200).json({ success: true, message: `Ticket execution status mutated state shifted to: ${status}` });
  } catch (err) {
    console.error("Failed patching administrative update command branch:", err);
    res.status(500).json({ error: "Internal database write processing state malfunction exception." });
  }
});

// 6. 🆕 GET Route: Fetch Approved tickets sorted by journeyDate for Landing Page Latest Ticket Section
app.get('/api/tickets/approved', async (req, res) => {
  try {
    // Queries only approved entries and sorts ascendingly (closest upcoming journey dates first)
    const approvedTickets = await ticketsCollection
      .find({ status: "Approved" })
      .sort({ journeyDate: 1, createdAt: -1 })
      .toArray();

    res.status(200).json(approvedTickets);
  } catch (err) {
    console.error("Failed public landing page query fetch execution:", err);
    res.status(500).json({ error: "Internal server public read exception." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});