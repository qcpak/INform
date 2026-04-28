if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(() => console.log('SW OK'));
    });
}

// تابع تغییر تب
window.openTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    renderItems();
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('injectionForm');
    const tableBody = document.getElementById('tableBody');
    const todayItemsContainer = document.getElementById('todayItemsContainer');
    const searchInput = document.getElementById('searchInput');
    const imageInput = document.getElementById('imageInput');
    const exportBtn = document.getElementById('exportExcel');

    let items = JSON.parse(localStorage.getItem('injection_db_v2')) || [];
    let currentImageBase64 = "";
    let bomLookupTable = {};

    async function loadBomData() {
        try {
            const response = await fetch('bom-data.json');
            const data = await response.json();
            for (let cat in data) {
                for (let model in data[cat]) {
                    data[cat][model].forEach(i => {
                        bomLookupTable[i.code] = { name: i.name, type: cat, model: model };
                    });
                }
            }
        } catch (e) { console.log("BOM Data not found"); }
    }
    loadBomData();

    document.getElementById('partCode').addEventListener('input', (e) => {
        const info = bomLookupTable[e.target.value.trim()];
        if(info) {
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
        const partCode = document.getElementById('partCode').value.trim();

        const isDuplicate = items.some(i => i.partCode === partCode && i.id.toString() !== editingId);
        if(isDuplicate) {
            alert("خطا: این کد قبلاً ثبت شده است!");
            return;
        }

        const data = {
            id: editingId ? parseInt(editingId) : Date.now(),
            date: editingId ? items.find(x=>x.id==editingId).date : new Date().toLocaleDateString('fa-IR'),
            partCode: partCode,
            partName: document.getElementById('partName').value,
            productType: document.getElementById('productType').value,
            model: document.getElementById('model').value,
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
            usedPartName: document.getElementById('usedPartName').value,
            usedPartWeight: document.getElementById('usedPartWeight').value,
            specialTools: document.getElementById('specialTools').value,
            packagingType: document.getElementById('packagingType').value,
            packagingQty: document.getElementById('packagingQty').value,
            notes: document.getElementById('notes').value,
            image: currentImageBase64 || (editingId ? items.find(x=>x.id==editingId).image : "")
        };

        if (editingId) {
            const idx = items.findIndex(i => i.id == editingId);
            items[idx] = data;
        } else {
            items.unshift(data);
        }

        localStorage.setItem('injection_db_v2', JSON.stringify(items));
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
        document.getElementById('submitBtn').innerText = "ثبت نهایی";
    }

    function renderItems() {
        const term = searchInput.value.trim();
        const today = new Date().toLocaleDateString('fa-IR');
        
        tableBody.innerHTML = "";
        todayItemsContainer.innerHTML = "";

        const filteredItems = items.filter(i => i.partName.includes(term) || i.partCode.includes(term));

        filteredItems.forEach(item => {
            // ۱. رندر در جدول اصلی (تب دوم)
            const row = `
                <tr>
                    <td class="sticky-col">
                        <i class="bi bi-pencil-square" onclick="editItem(${item.id})" style="color:blue; cursor:pointer; margin-left:10px"></i>
                        <i class="bi bi-trash3" onclick="deleteItem(${item.id})" style="color:red; cursor:pointer"></i>
                    </td>
                    <td><b>${item.partCode}</b></td>
                    <td>${item.partName}</td>
                    <td>${item.productType}</td>
                    <td>${item.model}</td>
                    <td>${item.mainMaterial}</td>
                    <td>${item.altMaterial}</td>
                    <td>${item.masterbatch}</td>
                    <td>${item.machineName}</td>
                    <td>${item.moldCode}</td>
                    <td>${item.cavity}</td>
                    <td>${item.cycleTime}</td>
                    <td>${item.coolingTime}</td>
                    <td>${item.partWeight}</td>
                    <td>${item.runnerWeight}</td>
                    <td>${item.usedPartName}</td>
                    <td>${item.usedPartWeight}</td>
                    <td>${item.specialTools}</td>
                    <td>${item.packagingType}</td>
                    <td>${item.packagingQty}</td>
                    <td>${item.date}</td>
                    <td>${item.notes}</td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);

            // ۲. رندر در لیست امروز (تب اول) با دکمه ویرایش و حذف
            if (item.date === today) {
                const card = `
                    <div class="item-card">
                        <span><b>${item.partCode}</b> | ${item.partName}</span>
                        <div class="card-actions-mini">
                            <i class="bi bi-pencil-square" onclick="editItem(${item.id})" style="color:blue"></i>
                            <i class="bi bi-trash3" onclick="deleteItem(${item.id})" style="color:red"></i>
                        </div>
                    </div>`;
                todayItemsContainer.insertAdjacentHTML('beforeend', card);
            }
        });
        if(!todayItemsContainer.innerHTML) todayItemsContainer.innerHTML = "<p style='font-size:0.75rem; color:gray; text-align:center;'>موردی امروز ثبت نشده است.</p>";
    }

    window.editItem = (id) => {
        const item = items.find(i => i.id == id);
        openTab('registrationTab');
        document.getElementById('editingId').value = item.id;
        document.getElementById('partCode').value = item.partCode;
        document.getElementById('partName').value = item.partName;
        document.getElementById('productType').value = item.productType;
        document.getElementById('model').value = item.model;
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
        document.getElementById('usedPartName').value = item.usedPartName;
        document.getElementById('usedPartWeight').value = item.usedPartWeight;
        document.getElementById('specialTools').value = item.specialTools;
        document.getElementById('packagingType').value = item.packagingType;
        document.getElementById('packagingQty').value = item.packagingQty;
        document.getElementById('notes').value = item.notes;
        if(item.image) document.getElementById('imagePreview').innerHTML = `<img src="${item.image}">`;
        
        document.getElementById('submitBtn').innerText = "بروزرسانی تغییرات";
        document.getElementById('cancelEdit').style.display = "block";
        window.scrollTo({top:0, behavior:'smooth'});
    };

    window.deleteItem = (id) => {
        if(confirm("آیا این مورد حذف شود؟")) {
            items = items.filter(i => i.id !== id);
            localStorage.setItem('injection_db_v2', JSON.stringify(items));
            renderItems();
        }
    };

    exportBtn.addEventListener('click', () => {
        if (items.length === 0) return;
        const headers = ["کد", "نام", "محصول", "مدل", "سایکل", "وزن", "تاریخ"];
        let csv = "\uFEFF" + headers.join(",") + "\n";
        items.forEach(i => {
            csv += `"${i.partCode}","${i.partName}","${i.productType}","${i.model}","${i.cycleTime}","${i.partWeight}","${i.date}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Injection_Report.csv`;
        a.click();
    });

    searchInput.addEventListener('input', renderItems);
    renderItems();
});

function showSuccess() {
    const m = document.getElementById('successModal');
    m.style.display = 'flex';
    setTimeout(() => m.style.display = 'none', 1500);
}