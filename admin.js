// ========== admin.js ==========

import { app } from './firebase-config.js';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const productsCol = collection(db, "products");
const statsDocRef = doc(db, 'site_data', 'stats');

// 🔥 كود الحماية
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    
    // --- زر تسجيل الخروج ---
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = 'login.html';
            }).catch((error) => console.error("خطأ:", error));
        });
    }

    // --- 1. نظام جلب الزوار لايف ---
    onSnapshot(statsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const currentVisits = docSnap.data().visits || 0;
            const visitorCounter = document.getElementById('adminLiveVisitors');
            if (visitorCounter) visitorCounter.innerText = currentVisits;
        }
    });

    // --- 2. جلب الإحصائيات ---
    async function loadStats() {
        try {
            const ordersSnap = await getDocs(collection(db, "orders"));
            let totalEarnings = 0;
            let totalOrders = 0;
            
            ordersSnap.forEach((orderDoc) => {
                const orderData = orderDoc.data();
                if (orderData.totalAmount) totalEarnings += parseFloat(orderData.totalAmount);
                totalOrders++;
            });

            document.getElementById('adminTotalEarnings').innerText = `${totalEarnings.toFixed(2)} JD`;
            document.getElementById('adminTotalOrders').innerText = totalOrders;
        } catch (e) {
            console.log("خطأ في جلب الإحصائيات.");
        }
    }
    loadStats();


    // ==========================================
    // 🔥 بناء النافذة المنبثقة الاحترافية (Modal)
    // ==========================================
    let currentEditingProdId = null;

    function setupCustomModal() {
        // زرع تصميم الـ CSS الخاص بالنافذة
        const style = document.createElement('style');
        style.innerHTML = `
            .zarina-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(31, 30, 26, 0.6); backdrop-filter: blur(4px);
                z-index: 9999; display: none; justify-content: center; align-items: center;
                opacity: 0; transition: opacity 0.3s ease;
            }
            .zarina-modal-overlay.active { opacity: 1; }
            .zarina-modal {
                background: #FFFEF9; padding: 2rem; border-radius: 24px;
                width: 90%; max-width: 450px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                transform: translateY(20px); transition: transform 0.3s ease;
                border: 1px solid #EADBC6; border-top: 5px solid var(--gold, #C6A43F);
                direction: rtl; font-family: 'Tajawal', sans-serif;
            }
            .zarina-modal-overlay.active .zarina-modal { transform: translateY(0); }
            .zarina-modal h3 { color: var(--forest-green, #2F5D3A); margin-top: 0; margin-bottom: 1.5rem; font-size: 1.4rem;}
            .modal-actions { display: flex; gap: 10px; margin-top: 1.5rem; }
            .btn-cancel {
                flex: 1; padding: 12px; background: #F0EBE1; border: 1px solid #D9CBB5;
                border-radius: 12px; cursor: pointer; font-weight: bold; color: #4A463E; transition: 0.3s;
            }
            .btn-cancel:hover { background: #EADBC6; }
            #btnSaveEditPrice { flex: 2; margin-top: 0; }
        `;
        document.head.appendChild(style);

        // زرع هيكل الـ HTML الخاص بالنافذة
        const modalHTML = `
            <div id="priceEditModal" class="zarina-modal-overlay">
                <div class="zarina-modal">
                    <h3><i class="fas fa-tags"></i> تعديل سعر المنتج</h3>
                    <form id="editPriceForm">
                        <div class="form-group">
                            <label>السعر الأساسي / الحالي (JD) *</label>
                            <input type="number" step="0.01" id="modalCurrentPrice" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>السعر قبل الخصم (JD) - اختياري</label>
                            <input type="number" step="0.01" id="modalOldPrice" class="form-control" placeholder="اتركه فارغاً إذا لم يكن هناك خصم">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-cancel" id="btnCancelModal">إلغاء</button>
                            <button type="submit" class="btn-submit" id="btnSaveEditPrice">حفظ التعديلات</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // برمجة وظائف النافذة (فتح، إغلاق، حفظ)
        const modalOverlay = document.getElementById('priceEditModal');
        const form = document.getElementById('editPriceForm');
        
        // إغلاق النافذة
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => { modalOverlay.style.display = 'none'; currentEditingProdId = null; }, 300);
        };

        document.getElementById('btnCancelModal').onclick = closeModal;
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); }; // الإغلاق عند النقر خارجها

        // تنفيذ الحفظ
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentEditingProdId) return;

            const btnSave = document.getElementById('btnSaveEditPrice');
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
            btnSave.disabled = true;

            const newPrice = document.getElementById('modalCurrentPrice').value;
            const oldPriceStr = document.getElementById('modalOldPrice').value;
            const newOldPrice = oldPriceStr.trim() !== "" ? parseFloat(oldPriceStr) : null;

            try {
                const docRef = doc(db, "products", currentEditingProdId);
                await updateDoc(docRef, {
                    price: parseFloat(newPrice),
                    oldPrice: newOldPrice
                });
                closeModal();
                loadProductsToTable(); // تحديث الجدول مباشرة
            } catch (error) {
                console.error("خطأ:", error);
                alert("حدث خطأ أثناء تحديث السعر!");
            } finally {
                btnSave.innerHTML = 'حفظ التعديلات';
                btnSave.disabled = false;
            }
        };
    }
    
    // تشغيل دالة بناء النافذة عند تحميل الصفحة
    setupCustomModal();

    // دالة فتح النافذة وإرسال البيانات لها
    window.openEditModal = (id, currentPrice, oldPrice) => {
        currentEditingProdId = id;
        document.getElementById('modalCurrentPrice').value = currentPrice;
        document.getElementById('modalOldPrice').value = (oldPrice && oldPrice !== 'null') ? oldPrice : '';
        
        const modal = document.getElementById('priceEditModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    };


    // --- 3. جلب المنتجات للجدول ---
    async function loadProductsToTable() {
        const tbody = document.getElementById('adminProductsTable');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل المنتجات...</td></tr>';
        
        try {
            const querySnapshot = await getDocs(productsCol);
            let html = '';
            
            querySnapshot.forEach((docSnap) => {
                const prod = docSnap.data();
                const isVisible = prod.isVisible !== false; 
                const isChecked = isVisible ? 'checked' : '';

                // معالجة السعر المخصوم
                let priceHtml = `${prod.price} JD`;
                if (prod.oldPrice && parseFloat(prod.oldPrice) > parseFloat(prod.price)) {
                    priceHtml += `<br><del style="color: #A09E98; font-size: 0.85rem;">${prod.oldPrice} JD</del>`;
                }

                html += `
                <tr>
                    <td><img src="${prod.imageUrl || 'https://placehold.co/60'}" class="prod-img-mini"></td>
                    <td>
                        <strong>${prod.nameAr}</strong><br>
                        <small style="color:#666;">${prod.nameEn}</small>
                    </td>
                    <td style="color: var(--gold); font-weight: bold;">${priceHtml}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="toggle-visibility" data-id="${docSnap.id}" ${isChecked}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="btn-icon btn-edit" onclick="openEditModal('${docSnap.id}', '${prod.price}', '${prod.oldPrice}')" title="تعديل السعر">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${docSnap.id}" title="حذف المنتج">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            });
            
            tbody.innerHTML = html === '' ? '<tr><td colspan="5" style="text-align:center;">لا يوجد منتجات حالياً.</td></tr>' : html;

            // تفعيل أزرار الحذف
            document.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const prodId = e.currentTarget.getAttribute('data-id');
                    if(confirm("متأكد إنك بدك تحذف هاد المنتج نهائياً؟")) {
                        await deleteDoc(doc(db, "products", prodId));
                        loadProductsToTable(); 
                    }
                });
            });

            // تفعيل أزرار الإخفاء/الإظهار
            document.querySelectorAll('.toggle-visibility').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const prodId = e.currentTarget.getAttribute('data-id');
                    const newVisibility = e.currentTarget.checked;
                    await updateDoc(doc(db, "products", prodId), { isVisible: newVisibility });
                });
            });

        } catch (error) {
            console.error("خطأ:", error);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">حدث خطأ في جلب البيانات!</td></tr>';
        }
    }
    
    loadProductsToTable(); 

    // --- 4. إضافة منتج جديد ---
    const addForm = document.getElementById('addProductForm');
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tagsInput = document.getElementById('prodTags').value;
        const tagsArray = tagsInput.split(' ').filter(tag => tag.trim() !== '');

        const oldPriceInput = document.getElementById('prodOldPrice').value;
        const oldPriceValue = oldPriceInput.trim() !== "" ? parseFloat(oldPriceInput) : null;

        const newProduct = {
            nameAr: document.getElementById('prodNameAr').value,
            nameEn: document.getElementById('prodNameEn').value,
            categoryAr: document.getElementById('prodCatAr').value,
            categoryEn: document.getElementById('prodCatEn').value,
            descAr: document.getElementById('prodDescAr').value,
            descEn: document.getElementById('prodDescEn').value,
            price: parseFloat(document.getElementById('prodPrice').value),
            oldPrice: oldPriceValue,
            imageUrl: document.getElementById('prodImg').value,
            tags: tagsArray,
            isVisible: true 
        };

        try {
            const submitBtn = addForm.querySelector('.btn-submit');
            submitBtn.innerText = "جاري الإضافة...";
            submitBtn.disabled = true;

            await addDoc(productsCol, newProduct);
            
            alert("تم إضافة المنتج للمتجر بنجاح! 🎉");
            addForm.reset(); 
            loadProductsToTable(); 

            submitBtn.innerText = "حفظ وإضافة للمتجر";
            submitBtn.disabled = false;
        } catch (error) {
            console.error("خطأ:", error);
            alert("حدث خطأ أثناء إضافة المنتج!");
        }
    });

    // --- أزرار التصفير ---
    const btnResetVisitors = document.getElementById('btnResetVisitors');
    if (btnResetVisitors) {
        btnResetVisitors.addEventListener('click', async () => {
            if (confirm("متأكد إنك بدك تصفر عداد الزوار؟")) {
                await updateDoc(statsDocRef, { visits: 0 });
                alert("تم تصفير عداد الزوار بنجاح!");
            }
        });
    }

    const btnResetOrders = document.getElementById('btnResetOrders');
    if (btnResetOrders) {
        btnResetOrders.addEventListener('click', async () => {
            if (confirm("تحذير: هاد الإجراء رح يحذف كل الطلبات السابقة نهائياً عشان يصفر الأرباح والطلبات. متأكد؟")) {
                try {
                    const ordersSnap = await getDocs(collection(db, "orders"));
                    ordersSnap.forEach(async (orderDoc) => {
                        await deleteDoc(doc(db, "orders", orderDoc.id));
                    });
                    alert("تم تصفير الطلبات والأرباح بنجاح!");
                    loadStats(); 
                } catch (error) {
                    console.error("خطأ:", error);
                }
            }
        });
    }
    // ==========================================
    // 🔥 نظام إدارة الكوبونات
    // ==========================================
    const couponsCol = collection(db, "coupons");

    // 1. إضافة كوبون جديد
    const addCouponForm = document.getElementById('addCouponForm');
    if (addCouponForm) {
        addCouponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = addCouponForm.querySelector('button[type="submit"]');
            submitBtn.innerText = "جاري الإضافة...";
            submitBtn.disabled = true;

            const newCoupon = {
                code: document.getElementById('couponCode').value.trim().toUpperCase(),
                type: document.getElementById('couponType').value,
                value: parseFloat(document.getElementById('couponValue').value),
                expiryDate: document.getElementById('couponExpiry').value,
                usageLimit: parseInt(document.getElementById('couponLimit').value),
                usedCount: 0, // يبدأ من صفر استخدام
                isActive: true
            };

            try {
                await addDoc(couponsCol, newCoupon);
                alert("تم إضافة الكوبون بنجاح! 🎉");
                addCouponForm.reset();
                loadCouponsToTable(); // تحديث الجدول
            } catch (error) {
                console.error("خطأ في إضافة الكوبون:", error);
                alert("حدث خطأ أثناء إضافة الكوبون!");
            } finally {
                submitBtn.innerText = "إضافة الكوبون";
                submitBtn.disabled = false;
            }
        });
    }

    // 2. جلب الكوبونات وعرضها في الجدول
    async function loadCouponsToTable() {
        const tbody = document.getElementById('adminCouponsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الكوبونات...</td></tr>';
        
        try {
            const querySnapshot = await getDocs(couponsCol);
            let html = '';
            
            querySnapshot.forEach((docSnap) => {
                const coupon = docSnap.data();
                const isChecked = coupon.isActive ? 'checked' : '';
                
                // تنسيق العرض حسب نوع الكوبون
                const displayValue = coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} JD`;
                
                // التحقق إذا الكوبون منتهي الصلاحية
                const today = new Date().toISOString().split('T')[0];
                const isExpired = coupon.expiryDate < today;
                const statusStyle = isExpired ? 'color: red; font-size: 0.85rem;' : 'color: green; font-size: 0.85rem;';
                const statusText = isExpired ? 'منتهي' : 'فعّال';

                html += `
                <tr style="border-bottom: 1px solid #EADBC6;">
                    <td style="padding: 12px;"><strong>${coupon.code}</strong></td>
                    <td style="padding: 12px; color: var(--gold); font-weight: bold;">${displayValue}</td>
                    <td style="padding: 12px;">${coupon.usedCount} / ${coupon.usageLimit}</td>
                    <td style="padding: 12px; direction: ltr; text-align: right;">${coupon.expiryDate}</td>
                    <td style="padding: 12px;">
                        <span style="${statusStyle}">${statusText}</span><br>
                        <label class="switch" style="transform: scale(0.8);">
                            <input type="checkbox" class="toggle-coupon-status" data-id="${docSnap.id}" ${isChecked}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td style="padding: 12px;">
                        <button class="btn-icon btn-delete-coupon" data-id="${docSnap.id}" title="حذف الكوبون" style="color: red; background: none; border: none; cursor: pointer; font-size: 1.1rem;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            });
            
            tbody.innerHTML = html === '' ? '<tr><td colspan="6" style="text-align:center;">لا يوجد كوبونات حالياً.</td></tr>' : html;

            // تفعيل أزرار الحذف
            document.querySelectorAll('.btn-delete-coupon').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const couponId = e.currentTarget.getAttribute('data-id');
                    if(confirm("متأكد إنك بدك تحذف هاد الكوبون نهائياً؟")) {
                        await deleteDoc(doc(db, "coupons", couponId));
                        loadCouponsToTable(); 
                    }
                });
            });

            // تفعيل أزرار التفعيل/التعطيل
            document.querySelectorAll('.toggle-coupon-status').forEach(checkbox => {
                checkbox.addEventListener('change', async (e) => {
                    const couponId = e.currentTarget.getAttribute('data-id');
                    const newStatus = e.currentTarget.checked;
                    await updateDoc(doc(db, "coupons", couponId), { isActive: newStatus });
                });
            });

        } catch (error) {
            console.error("خطأ:", error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">حدث خطأ في جلب الكوبونات!</td></tr>';
        }
    }
    
    // تشغيل دالة جلب الكوبونات عند فتح الصفحة
    loadCouponsToTable();
});