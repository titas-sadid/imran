require("dotenv").config();
const express=require("express"),cors=require("cors"),bcrypt=require("bcryptjs"),jwt=require("jsonwebtoken"),{Pool}=require("pg");

const app=express();
const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes("localhost")?false:{rejectUnauthorized:false}});
app.use(cors({origin:process.env.CORS_ORIGIN?.split(",").map(x=>x.trim())||"*"}));
app.use(express.json());

const auth=async(req,res,next)=>{
  try{
    const token=(req.headers.authorization||"").replace("Bearer ","");
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const {rows}=await pool.query("SELECT id,name,username,role,active FROM users WHERE id=$1",[payload.id]);
    if(!rows[0]||!rows[0].active) return res.status(401).json({message:"Unauthorized"});
    req.user=rows[0];next();
  }catch(e){res.status(401).json({message:"Unauthorized"})}
};
const adminOnly=(req,res,next)=>req.user.role==="ADMIN"?next():res.status(403).json({message:"Admin only"});

app.get("/api/health",(req,res)=>res.json({ok:true}));

app.post("/api/auth/login",async(req,res)=>{
  const {username,password}=req.body;
  const {rows}=await pool.query("SELECT * FROM users WHERE username=$1",[username]);
  const user=rows[0];
  if(!user||!user.active||!(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({message:"Invalid login"});
  const token=jwt.sign({id:user.id,role:user.role},process.env.JWT_SECRET,{expiresIn:"7d"});
  res.json({token,user:{id:user.id,name:user.name,username:user.username,role:user.role}});
});

app.post("/api/orders",async(req,res)=>{
  const {product_name,quantity,unit_price,customer_name,phone,address,payment_method}=req.body;
  if(!product_name||!quantity||!unit_price||!customer_name||!phone||!address) return res.status(400).json({message:"Required fields missing"});
  const total=Number(quantity)*Number(unit_price);
  const orderNumber="PRC-"+Date.now().toString().slice(-8);
  const {rows}=await pool.query(
    `INSERT INTO orders(order_number,product_name,quantity,unit_price,total_price,customer_name,phone,address,payment_method)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [orderNumber,product_name,quantity,unit_price,total,customer_name,phone,address,payment_method||"Cash on Delivery"]);
  res.status(201).json({order:rows[0]});
});

app.get("/api/orders",auth,async(req,res)=>{
  const {search="",status=""}=req.query;
  const params=[];const where=[];
  if(search){params.push(`%${search}%`);where.push(`(order_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR phone ILIKE $${params.length})`)}
  if(status){params.push(status);where.push(`status=$${params.length}`)}
  const sql=`SELECT * FROM orders ${where.length?"WHERE "+where.join(" AND "):""} ORDER BY created_at DESC`;
  const {rows}=await pool.query(sql,params);res.json({orders:rows});
});
app.patch("/api/orders/:id/status",auth,async(req,res)=>{
  const allowed=["PENDING","CONFIRMED","SHIPPED","DELIVERED","CANCELLED"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({message:"Invalid status"});
  const {rows}=await pool.query("UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *",[req.body.status,req.params.id]);
  res.json({order:rows[0]});
});
app.get("/api/dashboard",auth,async(req,res)=>{
  const {rows:[d]}=await pool.query(`SELECT COUNT(*)::int total_orders,
    COUNT(*) FILTER(WHERE status='PENDING')::int pending_orders,
    COUNT(*) FILTER(WHERE status='CONFIRMED')::int confirmed_orders,
    COALESCE(SUM(total_price) FILTER(WHERE status<>'CANCELLED'),0)::numeric total_sales FROM orders`);
  res.json({totalOrders:d.total_orders,pendingOrders:d.pending_orders,confirmedOrders:d.confirmed_orders,totalSales:d.total_sales});
});
app.get("/api/customers",auth,async(req,res)=>{
  const {rows}=await pool.query(`SELECT customer_name name,phone,address,COUNT(*)::int order_count FROM orders GROUP BY customer_name,phone,address ORDER BY MAX(created_at) DESC`);
  res.json({customers:rows});
});
app.get("/api/users",auth,async(req,res)=>{
  const {rows}=await pool.query("SELECT id,name,username,role,active FROM users ORDER BY created_at DESC");res.json({users:rows});
});
app.post("/api/users",auth,adminOnly,async(req,res)=>{
  const {name,username,password,role="STAFF"}=req.body;
  if(!name||!username||!password||!["ADMIN","STAFF"].includes(role)) return res.status(400).json({message:"Invalid fields"});
  const hash=await bcrypt.hash(password,12);
  try{
    const {rows}=await pool.query("INSERT INTO users(name,username,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,username,role,active",[name,username,hash,role]);
    res.status(201).json({user:rows[0]});
  }catch(e){res.status(409).json({message:"Username already exists"})}
});
app.listen(process.env.PORT||3000,()=>console.log("Backend running"));
