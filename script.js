if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('injectionForm');
    const tableBody = document.getElementById('tableBody');
    const todayItemsContainer = document.getElementById('todayItemsContainer');
    const searchInput = document.getElementById('searchInput');
    const partCodeInput = document.getElementById('partCode');
    const imageInput = document.getElementById('imageInput');
    
    let items = JSON.parse(localStorage.getItem('injection_db_v5')) || [];
    let currentImageBase64 = "";
    let bomLookupTable = {};

    // توابع جابجایی تب ها
    window.openTab = function(tabId, eventObj) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        
        if (eventObj && eventObj.currentTarget) {
            eventObj.currentTarget.classList.add('active');
        } else {
            const targetBtn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
            if(targetBtn) targetBtn.classList.add('active');
        }
        
        if (tabId === 'databaseTab') {
            renderItems();
        }
    };

    async function loadBomData() {
        try {
            const response = await fetch('bom-data.json');
            const data = await response.json();
            for (let category in data) {
                for (let modelName in data[category]) {
                    data[category][modelName].forEach(part => {
                        bomLookupTable[part.code] = { name: part.name, type: category, model: modelName };
                    });
                }
            }
        } catch (e) { console.log("BOM Load error"); }
    }
    loadBomData();

    partCodeInput.addEventListener('input', (e) => {
        const code = e.target.value.trim();
        const editingId = document.getElementById('editingId').value;

        if (code === "") {
            partCodeInput.style.border = "1px solid var(--border)";
        } else {
            const isDuplicate = items.some(i => i.partCode === code && i.id != editingId);
            if (isDuplicate) {
                partCodeInput.style.border = "3px solid #ef4444";
            } else {
                partCodeInput.style.border = "3px solid #22c55e";
            }
        }

        if(bomLookupTable[code]) {
            const info = bomLookupTable[code];
            document.getElementById('partName').value = info.name;
            document.getElementById('productType').value = info.type;
            document.getElementById('model').value = info.model;
        }
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 400; 
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
                else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                currentImageBase64 = canvas.toDataURL('image/jpeg', 0.6);
                document.getElementById('imagePreview').innerHTML = `<img src="${currentImageBase64}">`;
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const editingId = document.getElementById('editingId').value;
        const pCode = partCodeInput.value.trim();

        if (!editingId) {
            const exists = items.some(i => i.partCode === pCode);
            if (exists) {
                if (!confirm("⚠️ این کد قطعه قبلاً ثبت شده است. آیا می‌خواهید یک رکورد جدید برای آن ثبت کنید؟")) {
                    return;
                }
            }
        }
        
        const data = {
            id: editingId ? parseInt(editingId) : Date.now(),
            date: editingId ? items.find(x=>x.id == editingId).date : new Date().toLocaleDateString('fa-IR'),
            partCode: pCode,
            partName: document.getElementById('partName').value,
            moldCode: document.getElementById('moldCode').value,
            productType: document.getElementById('productType').value,
            model: document.getElementById('model').value,
            machineName: document.getElementById('machineName').value,
            mainMaterial: document.getElementById('mainMaterial').value,
            masterbatch: document.getElementById('masterbatch').value,
            dryerInfo: document.getElementById('dryerInfo').value,
            meltTemp: document.getElementById('meltTemp').value,
            cycleTime: document.getElementById('cycleTime').value,
            injectionPressure: document.getElementById('injectionPressure').value,
            injectionTime: document.getElementById('injectionTime').value,
            cylinderTemp: document.getElementById('cylinderTemp').value,
            coolingTime: document.getElementById('coolingTime').value,
            cavity: document.getElementById('cavity').value,
            partWeight: document.getElementById('partWeight').value,
            weightTolerance: document.getElementById('weightTolerance').value,
            runnerWeight: document.getElementById('runnerWeight').value,
            usedParts: document.getElementById('usedParts').value,
            usedPartsWeight: document.getElementById('usedPartsWeight').value,
            controlTools: document.getElementById('controlTools').value,
            injectionTools: document.getElementById('injectionTools').value,
            packagingInfo: document.getElementById('packagingInfo').value,
            notes: document.getElementById('notes').value,
            image: currentImageBase64 || (editingId ? items.find(x=>x.id == editingId).image : "")
        };

        if (editingId) {
            const idx = items.findIndex(i => i.id == editingId);
            items[idx] = data;
        } else {
            items.unshift(data);
        }

        localStorage.setItem('injection_db_v5', JSON.stringify(items));
        resetForm();
        renderItems();
        showSuccess();
    });

    function resetForm() {
        form.reset();
        document.getElementById('editingId').value = "";
        document.getElementById('imagePreview').innerHTML = "";
        currentImageBase64 = "";
        document.getElementById('cancelEdit').style.display = "none";
        document.getElementById('submitBtn').innerText = "ثبت نهایی شناسنامه";
        partCodeInput.style.border = "1px solid var(--border)";
    }

    document.getElementById('cancelEdit').addEventListener('click', resetForm);

    function renderItems() {
        const term = searchInput.value.trim();
        const today = new Date().toLocaleDateString('fa-IR');
        tableBody.innerHTML = "";
        todayItemsContainer.innerHTML = "";

        const filtered = items.filter(i => (i.partName||"").includes(term) || (i.partCode||"").includes(term));

        filtered.forEach((item, index) => {
            const row = `
                <tr>
                    <td class="sticky-col">
                        <i class="bi bi-pencil-square" onclick="editItem(${item.id})" style="color:blue; cursor:pointer; margin-left:8px"></i>
                        <i class="bi bi-trash3" onclick="deleteItem(${item.id})" style="color:red; cursor:pointer"></i>
                    </td>
                    <td>${index + 1}</td>
                    <td><b>${item.partCode}</b></td>
                    <td>${item.partName}</td>
                    <td>
                        ${item.image ? `<img src="${item.image}" width="40" style="cursor:pointer" onclick="downloadSingleImage('${item.image}', '${item.partCode}-${item.partName}')" title="دانلود عکس">` : '-'}
                    </td>
                    <td>${item.moldCode}</td>
                    <td>${item.productType}</td>
                    <td>${item.model}</td>
                    <td>${item.mainMaterial}</td>
                    <td>${item.masterbatch}</td>
                    <td>${item.machineName}</td>
                    <td>${item.cycleTime}</td>
                    <td>${item.meltTemp}</td>
                    <td>${item.injectionPressure}</td>
                    <td>${item.injectionTime}</td>
                    <td>${item.cylinderTemp}</td>
                    <td>${item.coolingTime}</td>
                    <td>${item.dryerInfo}</td>
                    <td>${item.partWeight}</td>
                    <td>${item.weightTolerance}</td>
                    <td>${item.cavity}</td>
                    <td>${item.runnerWeight}</td>
                    <td>${item.usedParts}</td>
                    <td>${item.usedPartsWeight}</td>
                    <td>${item.controlTools}</td>
                    <td>${item.injectionTools}</td>
                    <td>${item.packagingInfo}</td>
                    <td>${item.notes}</td>
                    <td>${item.date}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);

            if (item.date === today) {
                const card = `<div class="item-card"><span><b>${item.partCode}</b> | ${item.partName}</span><i class="bi bi-pencil-square" onclick="editItem(${item.id})" style="color:blue"></i></div>`;
                todayItemsContainer.insertAdjacentHTML('beforeend', card);
            }
        });
    }

    window.downloadSingleImage = (base64, fileName) => {
        const a = document.createElement('a');
        a.href = base64;
        a.download = `${fileName}.jpg`;
        a.click();
    };

    window.editItem = (id) => {
        const item = items.find(i => i.id == id);
        if(!item) return;
        
        window.openTab('registrationTab');
        
        document.getElementById('editingId').value = item.id;
        document.getElementById('partCode').value = item.partCode || "";
        document.getElementById('partName').value = item.partName || "";
        document.getElementById('moldCode').value = item.moldCode || "";
        document.getElementById('productType').value = item.productType || "";
        document.getElementById('model').value = item.model || "";
        document.getElementById('machineName').value = item.machineName || "";
        document.getElementById('mainMaterial').value = item.mainMaterial || "";
        document.getElementById('masterbatch').value = item.masterbatch || "";
        document.getElementById('dryerInfo').value = item.dryerInfo || "";
        document.getElementById('meltTemp').value = item.meltTemp || "";
        document.getElementById('cycleTime').value = item.cycleTime || "";
        document.getElementById('injectionPressure').value = item.injectionPressure || "";
        document.getElementById('injectionTime').value = item.injectionTime || "";
        document.getElementById('cylinderTemp').value = item.cylinderTemp || "";
        document.getElementById('coolingTime').value = item.coolingTime || "";
        document.getElementById('cavity').value = item.cavity || "";
        document.getElementById('partWeight').value = item.partWeight || "";
        document.getElementById('weightTolerance').value = item.weightTolerance || "";
        document.getElementById('runnerWeight').value = item.runnerWeight || "";
        document.getElementById('usedParts').value = item.usedParts || "";
        document.getElementById('usedPartsWeight').value = item.usedPartsWeight || "";
        document.getElementById('controlTools').value = item.controlTools || "";
        document.getElementById('injectionTools').value = item.injectionTools || "";
        document.getElementById('packagingInfo').value = item.packagingInfo || "";
        document.getElementById('notes').value = item.notes || "";
        
        if(item.image) {
            currentImageBase64 = item.image;
            document.getElementById('imagePreview').innerHTML = `<img src="${item.image}">`;
        } else {
            currentImageBase64 = "";
            document.getElementById('imagePreview').innerHTML = "";
        }
        
        document.getElementById('submitBtn').innerText = "بروزرسانی شناسنامه";
        document.getElementById('cancelEdit').style.display = "block";
        window.scrollTo(0,0);
        
        partCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
    };

    window.deleteItem = (id) => {
        if(confirm("آیا حذف شود؟")) {
            items = items.filter(i => i.id !== id);
            localStorage.setItem('injection_db_v5', JSON.stringify(items));
            renderItems();
        }
    };

    // خروجی اکسل کامل (CSV) با ستون تصویر خالی و تاریخ شمسی در نام فایل
    document.getElementById('exportExcel').addEventListener('click', () => {
        const h =[
            "ردیف", "تاریخ", "کد قطعه", "نام قطعه", "تصویر (خالی)", "نوع محصول", "مدل", "کد قالب", "نام دستگاه", 
            "مواد", "مستربچ", "گازگیر", "دمای ذوب", "سایکل", "فشار تزریق", "زمان تزریق", 
            "دمای سیلندر", "زمان خنکی", "کویته", "وزن قطعه", "تلرانس", "وزن راهگاه", 
            "قطعات جانبی", "وزن جانبی", "ابزار کنترلی", "ابزار تزریق", "بسته بندی", "توضیحات"
        ];
        let csv = "\uFEFF" + h.join(",") + "\n";
        items.forEach((i, idx) => {
            const row =[
                idx+1, i.date, i.partCode, i.partName, "", i.productType, i.model, i.moldCode, i.machineName,
                i.mainMaterial, i.masterbatch, i.dryerInfo, i.meltTemp, i.cycleTime, i.injectionPressure, i.injectionTime,
                i.cylinderTemp, i.coolingTime, i.cavity, i.partWeight, i.weightTolerance, i.runnerWeight,
                i.usedParts, i.usedPartsWeight, i.controlTools, i.injectionTools, i.packagingInfo, i.notes
            ];
            csv += row.map(v => `"${(v||"").toString().replace(/"/g, '""')}"`).join(",") + "\n";
        });

        // تولید نام فایل با تاریخ شمسی
        const todayJalali = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const fileName = `گزارش_تزریق_${todayJalali}.csv`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
    });

    // خروجی گزارش تصویری کامل (HTML)
    document.getElementById('exportPhotoReport').addEventListener('click', () => {
        let html = `
        <html dir="rtl">
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: tahoma; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; }
                th { background: #2563eb; color: #fff; font-size: 12px; }
                img { max-width: 80px; border-radius: 5px; }
                h1 { text-align: center; color: #2563eb; }
            </style>
        </head>
        <body>
            <h1>گزارش فنی کامل شناسنامه قطعات تزریق</h1>
            <table>
                <thead>
                    <tr>
                        <th>ردیف</th><th>تاریخ</th><th>عکس</th><th>کد قطعه</th><th>نام قطعه</th>
                        <th>محصول</th><th>مدل</th><th>قالب</th><th>دستگاه</th><th>مواد</th><th>مستربچ</th>
                        <th>گازگیر</th><th>ذوب</th><th>سایکل</th><th>فشار</th><th>زمان.تزریق</th>
                        <th>سیلندر</th><th>خنکی</th><th>کویته</th><th>وزن.قطعه</th><th>تلرانس</th>
                        <th>راهگاه</th><th>قطعات.جانبی</th><th>وزن.جانبی</th><th>ابزار.کنترل</th>
                        <th>ابزار.تزریق</th><th>بسته‌بندی</th><th>توضیحات</th>
                    </tr>
                </thead>
                <tbody>`;
        
        items.forEach((i, idx) => {
            html += `
                <tr>
                    <td>${idx+1}</td>
                    <td>${i.date || '-'}</td>
                    <td>${i.image ? `<img src="${i.image}">` : 'فاقد عکس'}</td>
                    <td><b>${i.partCode || '-'}</b></td>
                    <td>${i.partName || '-'}</td>
                    <td>${i.productType || '-'}</td>
                    <td>${i.model || '-'}</td>
                    <td>${i.moldCode || '-'}</td>
                    <td>${i.machineName || '-'}</td>
                    <td>${i.mainMaterial || '-'}</td>
                    <td>${i.masterbatch || '-'}</td>
                    <td>${i.dryerInfo || '-'}</td>
                    <td>${i.meltTemp || '-'}</td>
                    <td>${i.cycleTime || '-'}</td>
                    <td>${i.injectionPressure || '-'}</td>
                    <td>${i.injectionTime || '-'}</td>
                    <td>${i.cylinderTemp || '-'}</td>
                    <td>${i.coolingTime || '-'}</td>
                    <td>${i.cavity || '-'}</td>
                    <td>${i.partWeight || '-'}</td>
                    <td>${i.weightTolerance || '-'}</td>
                    <td>${i.runnerWeight || '-'}</td>
                    <td>${i.usedParts || '-'}</td>
                    <td>${i.usedPartsWeight || '-'}</td>
                    <td>${i.controlTools || '-'}</td>
                    <td>${i.injectionTools || '-'}</td>
                    <td>${i.packagingInfo || '-'}</td>
                    <td>${i.notes || '-'}</td>
                </tr>`;
        });
        html += `</tbody></table></body></html>`;

        const todayJalali = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `گزارش_تصویری_${todayJalali}.html`;
        a.click();
    });

    document.getElementById('backupData').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Injection_Backup.json"; a.click();
    });

    document.getElementById('restoreData').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                items = JSON.parse(ev.target.result);
                localStorage.setItem('injection_db_v5', JSON.stringify(items));
                renderItems();
            } catch(e) { alert("خطا در فایل"); }
        };
        reader.readAsText(e.target.files[0]);
    });

    searchInput.addEventListener('input', renderItems);
    renderItems();
});

function showSuccess() {
    const m = document.getElementById('successModal');
    m.style.display = 'flex';
    setTimeout(() => m.style.display = 'none', 1200);
}