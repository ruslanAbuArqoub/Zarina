// ========== admin.js ==========

import { app } from './firebase-config.js';
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
// لاحظ استدعاء دالة signOut هون عشان يشتغل زر الخروج
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const productsCol = collection(db, "products");
const statsDocRef = doc(db, 'site_data', 'stats');

// 🔥 كود الحماية: تأكد إنه اليوزر مسجل دخول قبل ما يحمل الصفحة
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // إذا مش مسجل دخول، اطرده لصفحة اللوجن
        window.location.href = 'login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    
    // --- زر تسجيل الخروج (Logout) ---
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                // بس يطلع من الحساب، بنحوله فوراً لصفحة اللوجن
                window.location.href = 'login.html';
            }).catch((error) => {
                console.error("خطأ في تسجيل الخروج:", error);
            });
        });
    }

    // 1. نظام جلب الزوار لايف (Real-time)
    onSnapshot(statsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const currentVisits = docSnap.data().visits || 0;
            const visitorCounter = document.getElementById('adminLiveVisitors');
            if (visitorCounter) visitorCounter.innerText = currentVisits;
        }
    });

    // 2. جلب إجمالي الأرباح والطلبات
    async function loadStats() {
        try {
            const ordersSnap = await getDocs(collection(db, "orders"));
            let totalEarnings = 0;
            let totalOrders = 0;
            
            ordersSnap.forEach((orderDoc) => {
                const orderData = orderDoc.data();
                if (orderData.totalAmount) {
                    totalEarnings += parseFloat(orderData.totalAmount);
                }
                totalOrders++;
            });

            document.getElementById('adminTotalEarnings').innerText = `$${totalEarnings.toFixed(2)}`;
            document.getElementById('adminTotalOrders').innerText = totalOrders;
        } catch (e) {
            console.log("لا يوجد طلبات حتى الآن أو هناك خطأ في جلبها.");
        }
    }
    loadStats();

    // 3. جلب المنتجات للجدول وعرضها
    async function loadProductsToTable() {
        const tbody = document.getElementById('adminProductsTable');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري تحميل المنتجات...</td></tr>';
        
        try {
            const querySnapshot = await getDocs(productsCol);
            let html = '';
            
            querySnapshot.forEach((docSnap) => {
                const prod = docSnap.data();
                const isVisible = prod.isVisible !== false; 
                const isChecked = isVisible ? 'checked' : '';

                html += `
                <tr>
                    <td><img src="${prod.imageUrl || 'https://placehold.co/60'}" class="prod-img-mini"></td>
                    <td>
                        <strong>${prod.nameAr}</strong><br>
                        <small style="color:#666;">${prod.nameEn}</small>
                    </td>
                    <td style="color: var(--gold); font-weight: bold;">$${prod.price}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="toggle-visibility" data-id="${docSnap.id}" ${isChecked}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
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
                    await updateDoc(doc(db, "products", prodId), {
                        isVisible: newVisibility
                    });
                });
            });

        } catch (error) {
            console.error("خطأ في جلب المنتجات للجدول:", error);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">حدث خطأ في جلب البيانات!</td></tr>';
        }
    }
    
    loadProductsToTable(); 

    // 4. إضافة منتج جديد
    const addForm = document.getElementById('addProductForm');
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tagsInput = document.getElementById('prodTags').value;
        const tagsArray = tagsInput.split(' ').filter(tag => tag.trim() !== '');

        const newProduct = {
            nameAr: document.getElementById('prodNameAr').value,
            nameEn: document.getElementById('prodNameEn').value,
            categoryAr: document.getElementById('prodCatAr').value,
            categoryEn: document.getElementById('prodCatEn').value,
            descAr: document.getElementById('prodDescAr').value,
            descEn: document.getElementById('prodDescEn').value,
            price: parseFloat(document.getElementById('prodPrice').value),
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
            console.error("خطأ في إضافة المنتج:", error);
            alert("حدث خطأ أثناء إضافة المنتج!");
        }
    });

    // --- أزرار التصفير (Reset) ---

    // 1. تصفير الزوار
    const btnResetVisitors = document.getElementById('btnResetVisitors');
    if (btnResetVisitors) {
        btnResetVisitors.addEventListener('click', async () => {
            if (confirm("متأكد إنك بدك تصفر عداد الزوار؟")) {
                await updateDoc(statsDocRef, { visits: 0 });
                alert("تم تصفير عداد الزوار بنجاح!");
            }
        });
    }

    // 2. تصفير الطلبات والأرباح (عن طريق مسح الطلبات القديمة)
    const btnResetOrders = document.getElementById('btnResetOrders');
    if (btnResetOrders) {
        btnResetOrders.addEventListener('click', async () => {
            if (confirm("تحذير: هاد الإجراء رح يحذف كل الطلبات السابقة نهائياً عشان يصفر الأرباح والطلبات. متأكد؟")) {
                try {
                    const ordersSnap = await getDocs(collection(db, "orders"));
                    // بنلف على كل طلب وبنحذفه
                    ordersSnap.forEach(async (orderDoc) => {
                        await deleteDoc(doc(db, "orders", orderDoc.id));
                    });
                    
                    alert("تم تصفير الطلبات والأرباح بنجاح!");
                    loadStats(); // تحديث الأرقام بالشاشة لتصير 0
                } catch (error) {
                    console.error("خطأ في تصفير الطلبات:", error);
                }
            }
        });
    }
});