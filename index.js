const express=require('express')
var cors = require('cors')
require('dotenv').config()
const cookieParser = require('cookie-parser')
const  jwt = require('jsonwebtoken');
const app =express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port=process.env.PORT || 5000

const corsOption={
    origin:['http://localhost:5173','http://localhost:5174','https://food-sharing-6af92.web.app'],
    credentials: true,
    optionSuccessStatus:200,
}


app.use(express.json())
app.use(cors(corsOption))
app.use(cookieParser())

//--------------------- create jwt verify middleware------------------------

const verifyToken=(req,res,next)=>{
  const token=req.cookies?.token
  if(!token)return res.status(401).send({message:'unauthorized access'})
    if(token){
      jwt.verify(token,process.env.ACCESS_TOKEN_SECRETS,(error,decoded)=>{
        if(error)return res.status(401).send({message:'unAuthorized access'})
        
        req.user=decoded
        next()
      })
    }
}


app.get('/',(req,res)=>{
    res.send('the server is running')
})




const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.vmhty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const foodsCollection=client.db('Foods').collection('collected')
    const requestedFoodsCollection=client.db('Foods').collection('requested')

// ------------create jwt token ---------------------------
app.post('/jwt',async(req,res)=>{
  const email=req.body
  const token=jwt.sign(email,process.env.ACCESS_TOKEN_SECRETS,{expiresIn:'365d'})
  res.cookie('token',token,{
    httpOnly: true,
    secure: process.env.NODE_ENV==='production',
    sameSite: process.env.NODE_ENV==='production'?'none':'strict'
  })
  .send({success:true})
})
// -----------clear jwt  token or cokies ------------
app.get('/logOut',(req,res)=>{
  res.clearCookie('token',{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:process.env.NODE_ENV==='production'?'none':'strict',
    maxAge:0
  }).send({success:true})
})

// ------------------ get all data from food collection in mongodb----------

app.get('/added-food',async(req,res)=>{
  const cursor=await foodsCollection.find().toArray()
  res.send(cursor)
})

  //  ----------------add food in Food collection in mongobd---------

  app.post('/added-food',async(req,res)=>{
    const addedFood=req.body; 
    const result=await foodsCollection.insertOne(addedFood) 
    res.send(result)
  })

  // -----------------get a single food from mongodb by find id ------------
  app.get('/details/:id',async(req,res)=>{
    const id =req.params.id
    const query={_id:new ObjectId(id)}
    const result =await foodsCollection.findOne(query)
    res.send(result)
  })
  // -----------------post foods requset in mongodb --------------
  app.post('/requset',async(req,res)=>{
    const requested=req.body
    const result=await requestedFoodsCollection.insertOne(requested)
    res.send(result)
  })

  // ---------get my posted data -------------------
  app.get('/my-posted-food/:email',verifyToken,async(req,res)=>{
    const tokenEmail=req.user.email
      const email=req.params.email;
      if(tokenEmail!==email){
        return res.status(403).send({message:'forbidden access'})
      }
      const query={donator_email:email}
      const result=await foodsCollection.find(query).toArray()
      res.send(result)
  })

  // ----------delete my posted food data from foods collection ---------

  app.delete('/delete/:id',async(req,res)=>{
    const id =req.params.id;
    const query={_id:new ObjectId(id)}
    const result=await foodsCollection.deleteOne(query)
    res.send(result)    
  })

  // -------get food data for edit it -----------------------
  app.get('/edit-info/:id',async(req,res)=>{
    const id=req.params.id
    const query={_id:new ObjectId(id)}
    const result=await foodsCollection.findOne(query)
    res.send(result) 

  })

  // -------------edit or update posted food ---------------------

  app.patch('/edit-info/:id',async(req,res)=>{
    const id=req.params.id
    const information=req.body;
    const filter={_id:new ObjectId(id)}
    const options = { upsert: true };
    const updateDoc ={
      $set:{
        ...information
      }
    }
    const result=await foodsCollection.updateOne(filter,updateDoc,options)
    res.send(result)
  })
// ----------------my foods request -------------------------
app.get('/my-request/:email',verifyToken,async(req,res)=>{
  const tokenEmail=req.user.email
     const email=req.params.email
     if(tokenEmail!==email){
      return res.status(403).send({message:'forbidden access'})
    }
     const query={user_email:email}
     const result=await requestedFoodsCollection.find(query).toArray()
     res.send(result)
})
// --------------get all available foods data -------------
app.get('/all-available-food/:available',async(req,res)=>{
  const available=req.params.available
  const query={food_status:available}
  const result=await foodsCollection.find(query).toArray()
  res.send(result)
})


// ------------- search and sort foods data   ----------------------

app.get('/all-available-food',async(req,res)=>{
  const search=req.query.search
  const sort=req.query.sort
  console.log(sort)
  let query={
    food_name:{$regex:search,$options:'i'}
   }
 let options={}
 if(sort)options={sort:{expire_data:sort==='asc'?1:-1}}
  const result=await foodsCollection.find(query,options).toArray()
  res.send(result) 
})


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port,()=>{
    console.log(`the port is running ${port}`)
})