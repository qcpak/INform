// فعال‌سازی قابلیت آفلاین
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker Registered'))
      .catch(err => console.log('Service Worker Failed', err));
  });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('injectionForm');
    const editingIdInput = document.getElementById('editingId');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const subPartsContainer = document.getElementById('subPartsContainer');
    const itemsContainer = document.getElementById('itemsContainer');
    const imageInput = document.getElementById('imageInput');
    const searchInput = document.getElementById('searchInput');
    const exportBtn = document.getElementById('exportExcel');

    let items = JSON.parse(localStorage.getItem('injection_db_final')) || [];
    let currentImageBase64 = "";

    // تابع کمکی برای افزودن ردیف قطعه جانبی
    function addSubPartRow(name = "", weight = "") {
        const row = document.createElement('div');
        row.className = 'sub-part-row';
        row.innerHTML = `
            <input type="text" placeholder="نام" class="sp-name" value="${name}">
            <input type="number" step="0.01" placeholder="وزن" class="sp-weight" value="${weight}">
            <button type="button" onclick="this.parentElement.remove()" style="color:red; border:none; background:none; font-weight:bold;">&times;</button>
        `;
        subPartsContainer.appendChild(row);
    }

    document.getElementById('addSubPart').addEventListener('click', () => addSubPartRow());

    // پردازش تصویر
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * (MAX_WIDTH / img.width);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                currentImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById('imagePreview').innerHTML = `<img src="${currentImageBase64}">`;
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // ثبت یا ویرایش فرم
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const subParts = [];
        document.querySelectorAll('.sub-part-row').forEach(row => {
            const n = row.querySelector('.sp-name').value;
            const w = row.querySelector('.sp-weight').value;
            if (n) subParts.push({ name: n, weight: w });
        });

        const formData = {
            productType: document.getElementById('productType').value,
            model: document.getElementById('model').value,
            partCode: document.getElementById('partCode').value,
            partName: document.getElementById('partName').value,
            mainMaterial: document.getElementById('mainMaterial').value,
            altMaterial: document.getElementById('altMaterial').value,
            masterbatch: document.getElementById('masterbatch').value,
            machineName: document.getElementById('machineName').value,
            moldCode: document.getElementById('moldCode').value,
            cavity: document.getElementById('cavity').value,
            cycleTime: document.getElementById('cycleTime').value,
            coolingTime: document.getElementById('coolingTime').value,
            partWeight: document.getElementById('partWeight').value,
            runnerWeight: document.getElementById('runnerWeight').value,
            specialTools: document.getElementById('specialTools').value,
            notes: document.getElementById('notes').value,
            packagingType: document.getElementById('packagingType').value,
            packagingQty: document.getElementById('packagingQty').value,
            subParts: subParts,
            image: currentImageBase64 || (editingIdInput.value ? items.find(i => i.id == editingIdInput.value).image : "")
        };

        if (editingIdInput.value) {
            // حالت ویرایش
            const index = items.findIndex(i => i.id == editingIdInput.value);
            items[index] = { ...items[index], ...formData };
            alert("ویرایش با موفقیت انجام شد.");
        } else {
            // حالت ثبت جدید
            formData.id = Date.now();
            formData.date = new Date().toLocaleDateString('fa-IR');
            items.unshift(formData);
            alert("قطعه جدید ثبت شد.");
        }

        localStorage.setItem('injection_db_final', JSON.stringify(items));
        resetForm();
        renderItems();
    });

    function resetForm() {
        form.reset();
        editingIdInput.value = "";
        subPartsContainer.innerHTML = "";
        document.getElementById('imagePreview').innerHTML = "";
        currentImageBase64 = "";
        submitBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> ثبت شناسنامه فنی';
        cancelEditBtn.style.display = "none";
    }

    cancelEditBtn.addEventListener('click', resetForm);

    // بارگذاری برای ویرایش
    window.editItem = (id) => {
        const item = items.find(i => i.id == id);
        if (!item) return;

        editingIdInput.value = item.id;
        document.getElementById('productType').value = item.productType;
        document.getElementById('model').value = item.model;
        document.getElementById('partCode').value = item.partCode;
        document.getElementById('partName').value = item.partName;
        document.getElementById('mainMaterial').value = item.mainMaterial;
        document.getElementById('altMaterial').value = item.altMaterial;
        document.getElementById('masterbatch').value = item.masterbatch;
        document.getElementById('machineName').value = item.machineName;
        document.getElementById('moldCode').value = item.moldCode;
        document.getElementById('cavity').value = item.cavity;
        document.getElementById('cycleTime').value = item.cycleTime;
        document.getElementById('coolingTime').value = item.coolingTime;
        document.getElementById('partWeight').value = item.partWeight;
        document.getElementById('runnerWeight').value = item.runnerWeight;
        document.getElementById('specialTools').value = item.specialTools;
        document.getElementById('notes').value = item.notes;
        document.getElementById('packagingType').value = item.packagingType;
        document.getElementById('packagingQty').value = item.packagingQty;

        subPartsContainer.innerHTML = "";
        item.subParts.forEach(sp => addSubPartRow(sp.name, sp.weight));

        if (item.image) {
            document.getElementById('imagePreview').innerHTML = `<img src="${item.image}">`;
        }

        submitBtn.innerHTML = '<i class="bi bi-pencil-square"></i> به‌روزرسانی تغییرات';
        cancelEditBtn.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function renderItems(term = "") {
        itemsContainer.innerHTML = "";
        const filtered = items.filter(i => i.partName.includes(term) || i.partCode.includes(term));
        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="card-actions">
                    <i class="bi bi-pencil-square edit-icon" onclick="editItem(${item.id})"></i>
                    <i class="bi bi-trash3-fill delete-icon" onclick="deleteItem(${item.id})"></i>
                </div>
                <h3>${item.partCode} - ${item.partName}</h3>
                <div class="item-data-full">
                    <div><b>محصول:</b> ${item.productType}</div>
                    <div><b>مدل:</b> ${item.model}</div>
                    <div><b>دستگاه:</b> ${item.machineName}</div>
                    <div><b>قالب:</b> ${item.moldCode}</div>
                    <div><b>کویته:</b> ${item.cavity}</div>
                    <div><b>سایکل:</b> ${item.cycleTime}s</div>
                    <div><b>خنکی:</b> ${item.coolingTime}s</div>
                    <div><b>وزن:</b> ${item.partWeight}g</div>
                    <div><b>راهگاه:</b> ${item.runnerWeight}g</div>
                    <div><b>مواد اصلی:</b> ${item.mainMaterial}</div>
                    <div><b>جایگزین:</b> ${item.altMaterial}</div>
                    <div><b>مستربچ:</b> ${item.masterbatch}</div>
                    <div><b>بسته‌بندی:</b> ${item.packagingType}</div>
                    <div><b>تعداد:</b> ${item.packagingQty}</div>
                    <div><b>ابزار خاص:</b> ${item.specialTools}</div>
                    <div><b>تاریخ:</b> ${item.date}</div>
                </div>
                ${item.image ? `<img src="${item.image}" class="card-img">` : ""}
            `;
            itemsContainer.appendChild(card);
        });
    }

    window.deleteItem = (id) => {
        if (confirm("آیا این مورد حذف شود؟")) {
            items = items.filter(i => i.id !== id);
            localStorage.setItem('injection_db_final', JSON.stringify(items));
            renderItems();
        }
    };

    searchInput.addEventListener('input', (e) => renderItems(e.target.value));

    // دانلود همزمان اکسل و عکس
    exportBtn.addEventListener('click', async () => {
        if (items.length === 0) return;

        const headers = ["ردیف", "نوع محصول", "مدل یا سری", "کد قطعه", "نام قطعه", "تصویر قطعه", "مواد اصلی", "مواد جایگزین", "مستربچ", "نام دستگاه", "کد قالب", "کویته", "سایکل تایم", "زمان خنکی", "وزن قطعه", "وزن راهگاه", "ابزار خاص", "توضیحات", "قطعات بکار رفته", "وزن جانبی", "نوع بسته‌بندی", "تعداد در بسته", "تاریخ ثبت"];
        let csv = "\uFEFF" + headers.join(",") + "\n";

        items.forEach((item, index) => {
            const subN = item.subParts.map(s => s.name).join(" | ");
            const subW = item.subParts.map(s => s.weight).join(" | ");
            const clean = (t) => `"${String(t || "").replace(/"/g, '""')}"`;
            const row = [index + 1, clean(item.productType), clean(item.model), clean(item.partCode), clean(item.partName), item.image ? "دارد" : "ندارد", clean(item.mainMaterial), clean(item.altMaterial), clean(item.masterbatch), clean(item.machineName), clean(item.moldCode), item.cavity, item.cycleTime, item.coolingTime, item.partWeight, item.runnerWeight, clean(item.specialTools), clean(item.notes), clean(subN), clean(subW), clean(item.packagingType), item.packagingQty, item.date];
            csv += row.join(",") + "\n";
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Technical_Data_Full.csv`;
        a.click();

        // دانلود عکس‌ها
        const withImg = items.filter(i => i.image);
        for (let i = 0; i < withImg.length; i++) {
            const link = document.createElement('a');
            link.href = withImg[i].image;
            link.download = `${withImg[i].partCode || withImg[i].partName}.jpg`;
            link.click();
            await new Promise(r => setTimeout(r, 400));
        }
    });

    renderItems();
});