const API_BASE = "https://YOUR-BACKEND-DOMAIN.com/api";
const PRICE=1250;
const money=n=>new Intl.NumberFormat("bn-BD",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+"৳";
const qty=document.getElementById("qty"), minus=document.getElementById("minus"), plus=document.getElementById("plus");

function update(){
  const q=Math.max(1,parseInt(qty.value||1));
  const total=PRICE*q;
  qty.value=q;
  document.getElementById("itemTotal").textContent=money(total);
  document.getElementById("sumQty").textContent=q;
  document.getElementById("sum").textContent=money(total);
  document.getElementById("subtotal").textContent=money(total);
  document.getElementById("grand").textContent=money(total);
  document.getElementById("buttonTotal").textContent=money(total);
}

minus.onclick=()=>{qty.value=Math.max(1,parseInt(qty.value)-1);update()};
plus.onclick=()=>{qty.value=parseInt(qty.value)+1;update()};

document.getElementById("orderForm").addEventListener("submit", async e=>{
  e.preventDefault();

  const button=e.target.querySelector(".submit");
  const name=document.getElementById("name").value.trim();
  const address=document.getElementById("address").value.trim();
  const phone=document.getElementById("phone").value.trim();
  const q=parseInt(qty.value);
  const total=PRICE*q;

  if(!name || !address || !phone) return;

  button.disabled=true;
  button.textContent="অর্ডার পাঠানো হচ্ছে...";

  try{
    const response=await fetch(`${API_BASE}/orders`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        product_name:"Procomil Longtime Power Spray",
        quantity:q,
        unit_price:PRICE,
        customer_name:name,
        phone,
        address,
        payment_method:"Cash on Delivery"
      })
    });

    const data=await response.json();

    if(!response.ok) throw new Error(data.message || "Order failed");

    e.target.reset();
    qty.value=1;
    update();

    alert(`অর্ডার সফলভাবে গ্রহণ করা হয়েছে।\nOrder ID: ${data.order.order_number}`);
  }catch(error){
    console.error(error);
    alert("দুঃখিত, অর্ডার পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।");
  }finally{
    button.disabled=false;
    button.innerHTML='অর্ডার কনফার্ম করুন <span id="buttonTotal"></span>';
    update();
  }
});

const observer=new IntersectionObserver(
  entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("show")}),
  {threshold:.12}
);
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));
update();
