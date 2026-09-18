const API_BASE="https://YOUR-BACKEND-DOMAIN.com/api";
let token=sessionStorage.getItem("admin_token");

const $=id=>document.getElementById(id);

function showApp(){
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  loadDashboard();
}
function api(path,options={}){
  options.headers={...(options.headers||{}),Authorization:`Bearer ${token}`,"Content-Type":"application/json"};
  return fetch(API_BASE+path,options).then(async r=>{
    const data=await r.json();
    if(!r.ok) throw new Error(data.message||"Request failed");
    return data;
  });
}
$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const r=await fetch(API_BASE+"/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("username").value,password:$("password").value})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.message||"Login failed");
    token=d.token;sessionStorage.setItem("admin_token",token);showApp();
  }catch(err){$("loginError").textContent=err.message}
};
$("logout").onclick=()=>{sessionStorage.removeItem("admin_token");location.reload()};

document.querySelectorAll(".sidebar button[data-page]").forEach(btn=>{
  btn.onclick=()=>showPage(btn.dataset.page);
});
function showPage(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(name).classList.remove("hidden");
  $("pageTitle").textContent=name[0].toUpperCase()+name.slice(1);
  if(name==="dashboard")loadDashboard();
  if(name==="orders")loadOrders();
  if(name==="customers")loadCustomers();
  if(name==="users")loadUsers();
}
async function loadDashboard(){
  try{const d=await api("/dashboard");$("totalOrders").textContent=d.totalOrders;$("pendingOrders").textContent=d.pendingOrders;$("confirmedOrders").textContent=d.confirmedOrders;$("totalSales").textContent=d.totalSales+"৳"}catch(e){console.error(e)}
}
async function loadOrders(){
  try{
    const q=new URLSearchParams();
    if($("orderSearch").value)q.set("search",$("orderSearch").value);
    if($("statusFilter").value)q.set("status",$("statusFilter").value);
    const d=await api("/orders?"+q);
    $("ordersBody").innerHTML=d.orders.map(o=>`<tr><td>${o.order_number}</td><td>${o.customer_name}<br>${o.phone}</td><td>${o.product_name} × ${o.quantity}</td><td>${o.total_price}৳</td><td>${o.status}</td><td>${new Date(o.created_at).toLocaleString()}</td><td><select onchange="changeStatus('${o.id}',this.value)"><option value="">Change</option><option>PENDING</option><option>CONFIRMED</option><option>SHIPPED</option><option>DELIVERED</option><option>CANCELLED</option></select></td></tr>`).join("");
  }catch(e){alert(e.message)}
}
async function changeStatus(id,status){if(status)await api("/orders/"+id+"/status",{method:"PATCH",body:JSON.stringify({status})});loadOrders();loadDashboard()}
$("refreshOrders").onclick=loadOrders;
$("orderSearch").oninput=loadOrders;
$("statusFilter").onchange=loadOrders;

async function loadCustomers(){const d=await api("/customers");$("customersBody").innerHTML=d.customers.map(c=>`<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.address}</td><td>${c.order_count}</td></tr>`).join("")}
async function loadUsers(){const d=await api("/users");$("usersBody").innerHTML=d.users.map(u=>`<tr><td>${u.name}</td><td>${u.username}</td><td>${u.role}</td><td>${u.active?"Active":"Inactive"}</td></tr>`).join("")}
$("userForm").onsubmit=async e=>{
  e.preventDefault();
  try{await api("/users",{method:"POST",body:JSON.stringify({name:$("newName").value,username:$("newUsername").value,password:$("newPassword").value,role:$("newRole").value})});$("userMessage").textContent="User created successfully";e.target.reset();loadUsers()}catch(err){$("userMessage").textContent=err.message}
};
if(token)showApp();
