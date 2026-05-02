if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
}

window.openTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event) event.currentTarget.classList.add('active');
    renderItems();
};

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

    // بارگذاری دیتای BOM برای تکمیل خودکار
    async function loadBomData() {
        try {
            const response = await fetch('bom-data.json');
            const data = await response.json();
            // تبدیل ساختار درختی BOM به یک لیست تخت برای جستجوی سریع
            for (let category in data) {
                for (let modelName in data[category]) {
                    data[category][modelName].forEach(part => {
                        bomLookupTable[part.code] = { 
                            name: part.name, 
                            type: category, 
                            model: modelName 
                        };
                    });
                }
            }
            console.log("BOM Loaded");
        } catch (e) { console.log("BOM file not found or error"); }
    }
    loadBomData();

    // تکمیل خودکار با وارد کردن کد قطعه
    partCodeInput.addEventListener('input', (e) => {
        const code = e.target.value.trim();
        if(bomLookupTable[code]) {
            const info = bomLookupTable[code];
            document.getElementById('partName').value = info.name;
            document.getElementById('productType').value = info.type;
            document.getElementById('model').value = info.model;
            partCodeInput.style.backgroundColor = "#e8f5e9"; // تغییر رنگ برای تایید پیدا شدن
        } else {
            partCodeInput.style.backgroundColor = "#fff";
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
        
        const data = {
            id: editingId ? parseInt(editingId) : Date.now(),
            date: editingId ? items.find(x=>x.id==editingId).date : new Date().toLocaleDateString('fa-IR'),
            partCode: document.getElementById('partCode').value,
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
            image: currentImageBase64 || (editingId ? items.find(x=>x.id==editingId).image : "")
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
        partCodeInput.style.backgroundColor = "#fff";
    }

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
                    <td>${item.image ? `<img src="${item.image}" width="40">` : '-'}</td>
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

    window.editItem = (id) => {
        const item = items.find(i => i.id == id);
        openTab('registrationTab');
        document.getElementById('editingId').value = item.id;
        document.getElementById('partCode').value = item.partCode;
        document.getElementById('partName').value = item.partName;
        document.getElementById('moldCode').value = item.moldCode;
        document.getElementById('productType').value = item.productType;
        document.getElementById('model').value = item.model;
        document.getElementById('machineName').value = item.machineName;
        document.getElementById('mainMaterial').value = item.mainMaterial;
        document.getElementById('masterbatch').value = item.masterbatch;
        document.getElementById('dryerInfo').value = item.dryerInfo;
        document.getElementById('meltTemp').value = item.meltTemp;
        document.getElementById('cycleTime').value = item.cycleTime;
        document.getElementById('injectionPressure').value = item.injectionPressure;
        document.getElementById('injectionTime').value = item.injectionTime;
        document.getElementById('cylinderTemp').value = item.cylinderTemp;
        document.getElementById('coolingTime').value = item.coolingTime;
        document.getElementById('cavity').value = item.cavity;
        document.getElementById('partWeight').value = item.partWeight;
        document.getElementById('weightTolerance').value = item.weightTolerance;
        document.getElementById('runnerWeight').value = item.runnerWeight;
        document.getElementById('usedParts').value = item.usedParts;
        document.getElementById('usedPartsWeight').value = item.usedPartsWeight;
        document.getElementById('controlTools').value = item.controlTools;
        document.getElementById('injectionTools').value = item.injectionTools;
        document.getElementById('packagingInfo').value = item.packagingInfo;
        document.getElementById('notes').value = item.notes;
        if(item.image) {
            currentImageBase64 = item.image;
            document.getElementById('imagePreview').innerHTML = `<img src="${item.image}">`;
        }
        document.getElementById('submitBtn').innerText = "بروزرسانی";
        document.getElementById('cancelEdit').style.display = "block";
    };

    window.deleteItem = (id) => {
        if(confirm("حذف شود؟")) {
            items = items.filter(i => i.id !== id);
            localStorage.setItem('injection_db_v5', JSON.stringify(items));
            renderItems();
        }
    };

    document.getElementById('exportExcel').addEventListener('click', () => {
        const h = ["ردیف", "کد قطعه", "نام قطعه", "کد قالب", "نوع محصول", "مدل", "مواد", "مستربچ", "دستگاه", "سایکل", "دمای ذوب", "فشار تزریق", "زمان تزریق", "دمای سیلندر", "زمان خنکی", "گازگیر", "وزن قطعه", "تلرانس", "کویته", "وزن راهگاه", "قطعات جانبی", "وزن جانبی", "ابزار کنترلی", "ابزار تزریق", "بسته بندی", "توضیحات", "تاریخ"];
        let csv = "\uFEFF" + h.join(",") + "\n";
        items.forEach((i, idx) => {
            const row = [idx+1, i.partCode, i.partName, i.moldCode, i.productType, i.model, i.mainMaterial, i.masterbatch, i.machineName, i.cycleTime, i.meltTemp, i.injectionPressure, i.injectionTime, i.cylinderTemp, i.coolingTime, i.dryerInfo, i.partWeight, i.weightTolerance, i.cavity, i.runnerWeight, i.usedParts, i.usedPartsWeight, i.controlTools, i.injectionTools, i.packagingInfo, i.notes, i.date];
            csv += row.map(v => `"${(v||"").toString().replace(/"/g, '""')}"`).join(",") + "\n";
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Report.csv"; a.click();
    });

    document.getElementById('backupData').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = "Backup.json"; a.click();
    });

    document.getElementById('restoreData').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            items = JSON.parse(ev.target.result);
            localStorage.setItem('injection_db_v5', JSON.stringify(items));
            renderItems();
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