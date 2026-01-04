const express = require('express')
const cors = require("cors");
require("dotenv").config();
const app = express()
const { MongoClient, ServerApiVersion,ObjectId} = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.r9l6yhe.mongodb.net/?appName=Cluster0`;
app.get('/', (req, res) => {
  res.send('Server is running fine!')
})

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
    const db=client.db("ImportExport");
    const productsCollection=db.collection("products");
    const importCollection=db.collection("imports");
    const usersCollection = db.collection("users");

//users collection api
    app.post("/users", async (req, res) => {
  const userData = req.body;

  // Default role to "user" only if not already set
  userData.role = userData.role || "user";

  const exists = await usersCollection.findOne({ email: userData.email });

  if (exists) {
    await usersCollection.updateOne(
      { email: userData.email },
      { $set: { last_loggedIn: new Date() } }
    );
    return res.send({ updated: true });
  }

  userData.created_at = new Date();
  const result = await usersCollection.insertOne(userData);
  res.send(result);
});


    // Get user role
app.get("/users/role", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send({ message: "Email required" });

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });

    res.send({ role: user.role });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

const verifyAdmin = async (req, res, next) => {
  const email = req.query.email;
  const user = await usersCollection.findOne({ email });

  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden Access" });
  }
  next();
};


    //find all products
    app.get('/allProducts',async(req,res)=>{
      const cursor=productsCollection.find();
      const result=await cursor.toArray();
      res.send(result);
    });

    //post method to add a product
    app.post('/allProducts',verifyAdmin,async(req,res)=>{
      const newProduct=req.body;
        const result=await productsCollection.insertOne(newProduct);
        res.send({
        success: true,
        result,
      });
    });
    //get single product by id
    app.get('/allProducts/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await productsCollection.findOne(query);
      res.send(result);
    });

    app.get('/latestProducts',async(req,res)=>{
      const cursor=productsCollection.find().sort({ _id: -1 }).limit(6);
      const result=await cursor.toArray();
      res.send(result);
    });
    //my imports
    app.post('/myImports',async(req,res)=>{
      const newImport=req.body;
        const result=await importCollection.insertOne(newImport);
        res.send({
        success: true,
        result,
      });
    });

    app.get('/myImports',async(req,res)=>{
      const email=req.query.email;
      const result=await importCollection.find({addedBy:email}).toArray();
      res.send(result);
    });  
    app.delete('/myImports/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await importCollection.deleteOne(query);
      res.send(result);
    });

    //my exports
    app.get('/myExports',async(req,res)=>{
      const email=req.query.email;
      const result=await productsCollection.find({addedBy:email}).toArray();
      res.send(result);
    });
   
  app.delete('/myExports/:id',async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await productsCollection.deleteOne(query);
      res.send(result);
    });
 app.patch("/myExports/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      productName: updatedData.productName,
      price: updatedData.price,
      rating: updatedData.rating,
      originCountry: updatedData.originCountry,
      availableQuantity: updatedData.availableQuantity,
      productImage: updatedData.productImage,
      description: updatedData.description,
    },
  };

  const result = await productsCollection.updateOne(filter, updateDoc);
  res.send(result);
});  



app.patch('/allProducts/:id', async (req, res) => {
  const id = req.params.id;
  const { quantity } = req.body; 

  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $inc: { availableQuantity: -quantity },
  };

  const result = await productsCollection.updateOne(filter, updateDoc);
  res.send(result);
});
app.get('/search', async (req, res) => {
  const searchText = req.query.search;
  const result = await productsCollection 
    .find({ productName: { $regex: searchText, $options: "i" } })
    .toArray();
  res.send(result);
});


app.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const email = req.query.email;

    // total users
    const totalUsers = await usersCollection.countDocuments();

    // 🔥 ONLY MY EXPORTS
    const myExportStats = await productsCollection.aggregate([
      {
        $match: { addedBy: email },
      },
      {
        $group: {
          _id: null,
          myTotalExports: { $sum: 1 },
          myExportValue: { $sum: "$price" },
          myTotalQuantity: { $sum: "$availableQuantity" },
          avgRating: { $avg: "$rating" },
        },
      },
    ]).toArray();

    const stats = myExportStats[0] || {};

    res.send({
      totalUsers,
      myTotalExports: stats.myTotalExports || 0,
      myExportValue: stats.myExportValue || 0,
      myTotalQuantity: stats.myTotalQuantity || 0,
      avgRating: stats.avgRating || 0,
    });
  } catch (err) {
    res.status(500).send({ message: "Admin stats failed" });
  }
});

app.get("/user/stats", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send({ message: "Email required" });

  try {
    const myImports = await importCollection.find({ addedBy: email }).toArray();

    const totalImports = myImports.length;
    const totalQuantity = myImports.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const totalSpent = myImports.reduce(
      (sum, item) => sum + (item.price || 0),
      0
    );

    res.send({
      totalImports,
      totalQuantity,
      totalSpent,
    });
  } catch (err) {
    res.status(500).send({ message: "User stats failed" });
  }
});




    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server app listening on port ${port}`)
})
