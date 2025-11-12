const express = require('express')
const cors = require("cors");
const app = express()
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://ImportExport-db:bNqDEmyZ84wjVEvx@cluster0.r9l6yhe.mongodb.net/?appName=Cluster0";
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
    await client.connect();
    
    const db=client.db("ImportExport");
    const productsCollection=db.collection("products");
    const importCollection=db.collection("imports");

    //find all products
    app.get('/allProducts',async(req,res)=>{
      const cursor=productsCollection.find();
      const result=await cursor.toArray();
      res.send(result);
    });

    //post method to add a product
    app.post('/allProducts',async(req,res)=>{
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


    await client.db("admin").command({ ping: 1 });
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
// bNqDEmyZ84wjVEvx