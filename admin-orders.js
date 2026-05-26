import { app } from './firebase-config.js';
import { getFirestore, collection, getDocs, doc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// حماية الصفحة
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = 'login.html';
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'login.html');
});

// حالات الطلب
const statusOptions = {
    "Pending": "قيد الانتظار",
    "Processing": "جاري التجهيز",
    "Shipped": "خرج للتوصيل",
    "Delivered": "تم التوصيل",
    "Cancelled": "ملغي"
};

function itemOptionLabel(item) {
    return item.variantLabel || item.selectedVariant || item.optionLabel || '';
}

function itemDisplayName(item) {
    return item.nameAr || item.nameEn || item.name || 'منتج';
}

async function loadOrders() {
    try {
        // بنجيب الطلبات مرتبة من الأحدث للأقدم
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        let activeHtml = '';
        let completedHtml = '';
        
        let todayNewCount = 0;
        let todayCompletedCount = 0;
        let todayEarnings = 0;
        let activeTotalCount = 0;

        // تحديد بداية اليوم (عشان نصفر العداد تلقائياً كل يوم الساعة 12 بالليل)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        querySnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const shortId = orderId.substring(0, 6).toUpperCase();
            
            // تحويل وقت الفايربيس لتاريخ مقروء
            const orderDate = order.createdAt ? order.createdAt.toDate() : new Date();
            const dateString = orderDate.toLocaleString('ar-JO', { dateStyle: 'short', timeStyle: 'short' });
            
            const isToday = orderDate >= startOfToday;
            const status = order.status || "Pending";

            // تحديث العدادات اليومية
            if (isToday) {
                if (status === "Pending" || status === "Processing" || status === "Shipped") todayNewCount++;
                if (status === "Delivered") {
                    todayCompletedCount++;
                    todayEarnings += parseFloat(order.totalAmount || 0);
                }
            }

            // بناء سطر الجدول
            let promoBadge = order.promoCodeUsed ? `<br><span class="badge badge-promo"><i class="fas fa-tag"></i> ${order.promoCodeUsed} (-${order.discountAmount} JD)</span>` : '';
            
            // تجهيز قائمة المنتجات (عشان التفاصيل المخفية)
            let itemsListHtml = '';
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const option = itemOptionLabel(item);
                    itemsListHtml += `
                        <li>
                            <span>
                                <strong>${itemDisplayName(item)}</strong> (x${item.quantity})
                                ${option ? `<br><small style="color:#2F5D3A;"><i class="fas fa-weight-hanging"></i> الحجم/الخيار: ${option}</small>` : ''}
                            </span>
                            <span>${(item.price * item.quantity).toFixed(2)} JD</span>
                        </li>`;
                });
            }

            const trHtml = `
                <tr>
                    <td><strong>#${shortId}</strong></td>
                    <td>
                        ${order.customerName}<br>
                        <small dir="ltr">${order.customerPhone}</small>
                    </td>
                    <td dir="ltr">${dateString}</td>
                    <td>
                        <strong>${parseFloat(order.totalAmount).toFixed(2)} JD</strong>
                        ${promoBadge}
                    </td>
                    <td>
                        <select class="status-select status-${status}" data-id="${orderId}">
                            ${Object.keys(statusOptions).map(key => `<option value="${key}" ${status === key ? 'selected' : ''}>${statusOptions[key]}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="action-btn toggle-details" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
                        <button class="action-btn btn-print print-order" data-order='${JSON.stringify(order).replace(/'/g, "&apos;")}' title="طباعة الفاتورة"><i class="fas fa-print"></i></button>
                    </td>
                </tr>
                <tr class="details-row">
                    <td colspan="6">
                        <div class="details-content">
                            <div class="details-grid">
                                <div>
                                    <h4 style="margin-top:0; color:var(--forest-green); border-bottom:1px solid #ccc; padding-bottom:5px;">بيانات التوصيل</h4>
                                    <p><strong>المدينة:</strong> ${order.customerCity}</p>
                                    <p><strong>العنوان:</strong> ${order.customerAddress}</p>
                                    <p><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'COD' ? 'الدفع عند الاستلام' : order.paymentMethod}</p>
                                    <p><strong>ملاحظات العميل:</strong> <span style="color:#C94C4C">${order.orderNotes || 'لا يوجد'}</span></p>
                                </div>
                                <div>
                                    <h4 style="margin-top:0; color:var(--forest-green); border-bottom:1px solid #ccc; padding-bottom:5px;">المنتجات (${order.items ? order.items.length : 0})</h4>
                                    <ul class="order-items-list">
                                        ${itemsListHtml}
                                        <li style="font-weight:bold; margin-top:10px;"><span>رسوم التوصيل</span> <span>${order.deliveryFee || 3.00} JD</span></li>
                                        <li style="font-weight:bold; color:var(--gold); border-top:2px solid var(--gold); padding-top:10px;"><span>الإجمالي النهائي</span> <span>${parseFloat(order.totalAmount).toFixed(2)} JD</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            // فرز الطلبات حسب الحالة
            if (status === "Delivered" || status === "Cancelled") {
                completedHtml += trHtml;
            } else {
                activeHtml += trHtml;
                activeTotalCount++;
            }
        });

        // طباعة العدادات بالشاشة
        document.getElementById('todayNewOrders').innerText = todayNewCount;
        document.getElementById('todayCompletedOrders').innerText = todayCompletedCount;
        document.getElementById('todayEarnings').innerText = `${todayEarnings.toFixed(2)} JD`;
        document.getElementById('activeOrdersCount').innerText = activeTotalCount;

        // طباعة الجداول
        document.getElementById('activeOrdersTable').innerHTML = activeHtml || '<tr><td colspan="6" style="text-align:center;">لا يوجد طلبات حالية.</td></tr>';
        document.getElementById('completedOrdersTable').innerHTML = completedHtml || '<tr><td colspan="6" style="text-align:center;">لا يوجد طلبات مكتملة أو ملغية.</td></tr>';

        // تفعيل أزرار تغيير الحالة
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const orderId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                e.target.className = `status-select status-${newStatus}`; // تغيير اللون فوراً
                e.target.disabled = true;
                try {
                    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
                    // إعادة تحميل الصفحة عشان ينقل الطلب للجدول الصح
                    loadOrders(); 
                } catch (error) {
                    alert("حدث خطأ أثناء تحديث حالة الطلب");
                    e.target.disabled = false;
                }
            });
        });

        // تفعيل زر فتح/إغلاق التفاصيل (Accordion)
        document.querySelectorAll('.toggle-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                const detailsRow = tr.nextElementSibling;
                detailsRow.classList.toggle('active');
            });
        });

        // تفعيل زر الطباعة (طباعة بسيطة للفاتورة)
        document.querySelectorAll('.print-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderData = JSON.parse(e.currentTarget.getAttribute('data-order'));
                printInvoice(orderData);
            });
        });

    } catch (error) {
        console.error("Error loading orders: ", error);
        document.getElementById('activeOrdersTable').innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">خطأ في جلب الطلبات</td></tr>';
    }
}

// دالة الطباعة الاحترافية
function printInvoice(order) {
    const printWindow = window.open('', '_blank');
    let itemsHtml = order.items.map(i => `
        <tr>
            <td style="border:1px solid #ccc; padding:8px;">${itemDisplayName(i)}</td>
            <td style="border:1px solid #ccc; padding:8px;">${itemOptionLabel(i) || '-'}</td>
            <td style="border:1px solid #ccc; padding:8px;">${i.quantity}</td>
            <td style="border:1px solid #ccc; padding:8px;">${parseFloat(i.price || 0).toFixed(2)} JD</td>
            <td style="border:1px solid #ccc; padding:8px;">${(parseFloat(i.price || 0) * parseFloat(i.quantity || 0)).toFixed(2)} JD</td>
        </tr>
    `).join('');
    
    const html = `
    <html dir="rtl">
    <head>
        <title>فاتورة طلب - ZARINA</title>
        <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px; }
            .total { font-size: 18px; font-weight: bold; text-align: left; }
        </style>
    </head>
    <body>
        <h1>ZARINA Apothecary</h1>
        <div class="info">
            <p><strong>اسم العميل:</strong> ${order.customerName}</p>
            <p><strong>رقم الهاتف:</strong> <span dir="ltr">${order.customerPhone}</span></p>
            <p><strong>العنوان:</strong> ${order.customerCity} - ${order.customerAddress}</p>
            <p><strong>ملاحظات:</strong> ${order.orderNotes || '-'}</p>
            <p><strong>طريقة الدفع:</strong> ${order.paymentMethod}</p>
        </div>
        <table>
            <tr><th>المنتج</th><th>الحجم / الخيار</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>
            ${itemsHtml}
        </table>
        <div class="total">رسوم التوصيل: ${order.deliveryFee || 3} JD</div>
        ${order.discountAmount ? `<div class="total" style="color:red;">خصم: -${order.discountAmount} JD</div>` : ''}
        <div class="total">الإجمالي المطلوب: ${order.totalAmount} JD</div>
        <p style="text-align:center; margin-top:40px; border-top:1px dashed #ccc; padding-top:10px;">شكراً لتسوقكم من زارينا!</p>
        <script>window.onload = function() { window.print(); window.close(); }</script>
    </body>
    </html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
}

// تشغيل الفنكشن أول ما تفتح الصفحة
document.addEventListener('DOMContentLoaded', loadOrders);
