const express = require('express');
const cors = require('cors'); 
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); 

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

let db, ticketsCollection, usersCollection;

// Establish persistent MongoDB Connection Pool
async function connectDB() {
  try {
    await client.connect();
    db = client.db("TicketBariDB"); 
    ticketsCollection = db.collection("tickets"); 
    usersCollection = db.collection("users"); // 👤 Used for user management tracking systems
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

// 2. POST Route: Insert a newly submitted vendor ticket (Checks if Vendor is Fraud first)
app.post('/api/tickets', async (req, res) => {
  try {
    const ticketPayload = req.body;

    if (!ticketPayload.title || !ticketPayload.from || !ticketPayload.to || !ticketPayload.vendorEmail) {
      return res.status(400).json({ error: "Missing required core ticket attributes." });
    }

    // 🛑 Fraud Guard Barrier Layer
    const vendorUser = await usersCollection.findOne({ email: ticketPayload.vendorEmail });
    if (vendorUser && vendorUser.role === "fraud") {
      return res.status(403).json({ error: "Access Denied. Fraudulent vendor profiles are restricted from creating listings." });
    }

    const result = await ticketsCollection.insertOne({
      ...ticketPayload,
      status: "pending",       
      isAdvertised: "Pending", 
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

// 5. PATCH Route: Admin Approve or Reject core site visibility status mutations
app.patch('/api/tickets/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; 

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

// 6. PATCH Route: Isolated operational endpoint for Admin Advertisement stream permissions
app.patch('/api/tickets/:id/advertise', async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdvertised } = req.body; 

    if (!["Approved", "Rejected"].includes(isAdvertised)) {
      return res.status(400).json({ error: "Invalid layout configuration tag value for advertisement mutation." });
    }

    const result = await ticketsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isAdvertised: isAdvertised } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Target data cluster block for ad alteration reference context not found." });
    }

    res.status(200).json({ success: true, message: `Ticket showcasing advertisement state mutated to: ${isAdvertised}` });
  } catch (err) {
    console.error("Failed patching administrative advertisement flag update branch:", err);
    res.status(500).json({ error: "Internal database write processing state malfunction exception." });
  }
});

// 7. GET Route: Fetch Approved tickets sorted by journeyDate for Landing Page Latest Ticket Section
app.get('/api/tickets/approved', async (req, res) => {
  try {
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

// ⚡ 8. NEW FIXED GET ROUTE: Fetch a single ticket by its dynamic Hex ID parameter string
app.get('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if incoming string matches standard MongoDB 24-character hex generation layout
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Malformed structural ID node syntax matching criteria parameters." });
    }

    const ticket = await ticketsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found in system matrix." });
    }

    res.status(200).json(ticket);
  } catch (err) {
    console.error("Failed fetching single travel manifest dynamic block payload:", err);
    res.status(500).json({ error: "Internal database tracking matrix query failure exceptions." });
  }
});

// 👥 9. GET Route: Fetch ALL users for Manage Users Section Panel
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await usersCollection.find({}).toArray();
    res.status(200).json(allUsers);
  } catch (err) {
    console.error("Failed fetching internal users registry:", err);
    res.status(500).json({ error: "Internal server user read exception." });
  }
});

// 🔨 10. PATCH Route: Mutate User Roles (Handles admin, vendor, and fraud cascade deletions)
app.patch('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, email } = req.body; // Expects values: "user", "admin", "vendor", "fraud"

    if (!["user", "admin", "vendor", "fraud"].includes(role)) {
      return res.status(400).json({ error: "Invalid systemic role identity assignment value matches." });
    }

    // Mutate targeted profile node role field
    const userUpdateResult = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: role } }
    );

    // ⚡ FRAUD CASCADE RULE: If flagged blacklisted as fraud, drop all active database site tickets instantly
    if (role === "fraud" && email) {
      await ticketsCollection.updateMany(
        { vendorEmail: email },
        { 
          $set: { 
            status: "Rejected", 
            isAdvertised: "Rejected" 
          } 
        }
      );
      console.log(`Cascade Enforcement executed: All tickets from vendor ${email} pulled down from operational instances.`);
    }

    res.status(200).json({ success: true, message: `User identity tier reconfigured status assigned as: ${role}` });
  } catch (err) {
    console.error("Failed altering user account classification state profile:", err);
    res.status(500).json({ error: "Internal database tracking write matrix disruption exception." });
  }
});

// 👤 11. NEW POST Route: Auto-Sync authenticated users into the `users` collection
app.post('/api/users/sync', async (req, res) => {
  try {
    const { email, name, image } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email tracking identifier is required to sync user profile." });
    }

    // Uses an update with an upsert flag: sets basic info, preserves existing assigned role if it already exists
    const result = await usersCollection.updateOne(
      { email: email },
      { 
        $set: { 
          name: name || "Anonymous User", 
          photo: image || "",
          lastActive: new Date()
        },
        $setOnInsert: { 
          role: "user", // Default systemic assignment tier for brand new accounts
          createdAt: new Date()
        } 
      },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: "User profile synchronized successfully." });
  } catch (err) {
    console.error("Failed executing user profile upsert routine:", err);
    res.status(500).json({ error: "Internal server data layer exception during user sync." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});