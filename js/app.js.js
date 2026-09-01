/* ------------------------------------------------------------------------- */
/* [FULL APP MODULE - ZERO TRUNCATION / 完整系統主流程控制腳本]               */
/* ------------------------------------------------------------------------- */
function setLanguage(l) {
  currentLang = l; safeSetStorage('xmart_lang', l);
  var btnEn = document.getElementById('langBtnEn'); var btnZh = document.getElementById('langBtnZh');
  if (btnEn) btnEn.classList.toggle('active', l === 'en'); if (btnZh) btnZh.classList.toggle('active', l === 'zh');
  document.querySelectorAll('[data-zh]').forEach(el => { const text = el.getAttribute(l === 'en' ? 'data-en' : 'data-zh'); if (text) el.innerText = text; });
  document.querySelectorAll('[data-placeholder-en]').forEach(el => { const ph = el.getAttribute(l === 'en' ? 'data-placeholder-en' : 'data-placeholder-zh'); if (ph) el.placeholder = ph; });
  document.querySelectorAll('.category-input').forEach(sel => { Array.from(sel.options).forEach(opt => { if (opt.value) { let k = opt.value.split('/')[0].trim(); if (catDict[k]) opt.text = catDict[k][l] || k; } }); });
  
  checkOfflineDrafts();
  if (document.getElementById('pendingContainer') && globalPendingData && document.getElementById('updateStoreSelect').value) renderPendingData(document.getElementById('updateStoreSelect').value, globalPendingData);
}

window.onload = async function() {
  setLanguage(currentLang);
  initCanvasEvents();
  checkOfflineDrafts();
  
  const cachedInit = safeGetStorage('xmart_init_data');
  if (cachedInit) {
    try {
      const initData = JSON.parse(cachedInit);
      rawStoreDataHtml = initData.storeOptions; rawVendorDataHtml = initData.vendorOptions; categoryOptionsHtml = initData.categoryOptions;
      document.querySelectorAll('.category-input').forEach(el => el.innerHTML = categoryOptionsHtml);
    } catch(e){}
  }

  try {
    apiCall('getInitialData').then(initData => {
      safeSetStorage('xmart_init_data', JSON.stringify(initData));
      rawStoreDataHtml = initData.storeOptions; rawVendorDataHtml = initData.vendorOptions; categoryOptionsHtml = initData.categoryOptions;
      document.querySelectorAll('.category-input').forEach(el => el.innerHTML = categoryOptionsHtml);
    }).catch(()=>{});

    await liff.init({ liffId: LIFF_ID });
    const cachedUser = safeGetStorage('xmart_cached_user');
    if (liff.isLoggedIn()) {
      lineProfile = await liff.getProfile();
      const authRes = await apiCall('checkLineUserRegistration', { lineUserId: lineProfile.userId });
      if (authRes && authRes.isRegistered) { currentUser = authRes; safeSetStorage('xmart_cached_user', JSON.stringify(authRes)); applyUserToUI(authRes); preloadData(); } else { showLogin(); }
    } else if (cachedUser) {
      try { currentUser = JSON.parse(cachedUser); applyUserToUI(currentUser); preloadData(); } catch(e) { showLogin(); }
    } else { if (!liff.isInClient()) { showLogin(); } else { liff.login({ redirectUri: LIFF_URL }); } }
    
    var loadingBox = document.getElementById('systemLoadingBox'); if (loadingBox) loadingBox.classList.add('hidden');
  } catch (err) {
    var loadingBox = document.getElementById('systemLoadingBox'); if (loadingBox) loadingBox.classList.add('hidden');
    showError("系統連線失敗: " + err.message);
  }
};

function showLogin() {
  renderStoreCheckboxes(); var loadingBox = document.getElementById('systemLoadingBox');
  if (loadingBox) loadingBox.classList.add('hidden'); document.getElementById('mainSystem').classList.add('hidden'); document.getElementById('loginSection').classList.remove('hidden');
}

function applyUserToUI(user) {
  document.getElementById('displayEmpName').innerText = user.empName; document.getElementById('displayStoreName').innerText = user.store ? "(" + user.store + ")" : "";
  var loadingBox = document.getElementById('systemLoadingBox'); if (loadingBox) loadingBox.classList.add('hidden');
  document.getElementById('loginSection').classList.add('hidden'); document.getElementById('mainSystem').classList.remove('hidden');
  const opts = user.isHQ ? rawStoreDataHtml : user.store.split(',').map(s => `<option value="${s.trim()}">${s.trim()}</option>`).join('');
  document.getElementById('newStoreSelect').innerHTML = opts; document.getElementById('updateStoreSelect').innerHTML = opts;
  if (!user.isHQ && user.store.split(',').length === 1) { document.getElementById('newStoreSelectWrapper').classList.add('hidden'); document.getElementById('updateStoreSelectWrapper').classList.add('hidden'); }
  else { document.getElementById('newStoreSelectWrapper').classList.remove('hidden'); document.getElementById('updateStoreSelectWrapper').classList.remove('hidden'); }
}

function renderStoreCheckboxes() {
  const container = document.getElementById('storeCheckboxGroup'); if (!rawStoreDataHtml) return;
  const t = document.createElement('div'); t.innerHTML = rawStoreDataHtml; let s = [];
  t.querySelectorAll('option').forEach(o => { if(o.value) s.push(o.value); });
  container.innerHTML = s.map(v => `<div class="pill-opt store-pill mb-1" onclick="this.classList.toggle('active')" data-value="${v}">${v}</div>`).join('');
}

async function submitRegistration() {
  const name = document.getElementById('regNameInput').value.trim();
  const stores = Array.from(document.querySelectorAll('#storeCheckboxGroup .store-pill.active')).map(p => p.getAttribute('data-value'));
  const isHQ = document.getElementById('isHqCheckbox').checked;
  if (!name || (stores.length === 0 && !isHQ)) return showToast(i18n[currentLang].incompleteData, "error");
  document.getElementById('loginBtn').disabled = true; document.getElementById('loginBtn').innerText = "Setting...";
  try {
    const userId = lineProfile ? lineProfile.userId : ("GUEST_" + Math.floor(Math.random()*1000));
    const res = await apiCall('registerNewUser', { lineUserId: userId, empName: name, storesArray: stores, isHQ: isHQ });
    if (res.success) { currentUser = res; safeSetStorage('xmart_cached_user', JSON.stringify(res)); applyUserToUI(res); showToast(i18n[currentLang].successAdd, "success"); preloadData(); }
  } catch(e) { showToast(e.message, "error"); document.getElementById('loginBtn').disabled = false; document.getElementById('loginBtn').innerText = "Complete Setup"; }
}

async function resetAccount() {
  if (confirm(i18n[currentLang].confirmReset)) {
    localStorage.removeItem('xmart_cached_user'); showOverlay("Resetting...", 50);
    try { await apiCall('deleteUserRegistration', { lineUserId: lineProfile ? lineProfile.userId : "" }); location.reload(); } catch(e) { location.reload(); }
  }
}

function switchMode(mode) {
  document.getElementById('newSection').classList.toggle('hidden', mode !== 'new'); 
  document.getElementById('updateSection').classList.toggle('hidden', mode !== 'update');
  if (mode === 'update') fetchPending();
}

async function preloadData() { try { globalPendingData = await apiCall('getAllPendingIssues'); } catch(e){} }
function showToast(msg, type = 'success') { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `custom-toast toast-${type}`; toast.innerText = msg; container.appendChild(toast); setTimeout(() => toast.classList.add('show'), 10); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500); }
function showError(err) { showToast(err.message || err, 'error'); hideOverlay(); }
function openLightbox(src) { document.getElementById('lightboxImg').src = src; document.getElementById('lightboxOverlay').classList.add('show'); }
function closeLightbox() { document.getElementById('lightboxOverlay').classList.remove('show'); }

function triggerPhotoInput(btn, mode) {
  const item = btn.closest('.issue-item') || btn.closest('.update-item') || btn.closest('.hq-repair-section');
  if (item._photos && item._photos.length >= 3) return showToast(i18n[currentLang].max3Photos, "error");
  const input = item.querySelector('input[type="file"]');
  mode === 'camera' ? input.setAttribute('capture', 'environment') : input.removeAttribute('capture'); input.click();
}

function handleMultiPhotoSelect(input) {
  const item = input.closest('.issue-item') || input.closest('.update-item') || input.closest('.hq-repair-section');
  if (!item._photos) item._photos = []; Array.from(input.files).forEach(f => { if (item._photos.length < 3) item._photos.push(f); });
  input.value = ""; renderGallery(item);
}

function renderGallery(item) {
  const gal = item.querySelector('.preview-gallery'); gal.innerHTML = "";
  (item._photos || []).forEach((f, i) => {
    const box = document.createElement('div'); box.className = 'preview-thumb-box photo-loaded-anim';
    const img = document.createElement('img'); const reader = new FileReader(); 
    reader.onload = e => img.src = e.target.result; reader.readAsDataURL(f); img.onclick = () => openLightbox(img.src);
    
    const markBtn = document.createElement('div'); markBtn.className = 'markup-btn-badge'; markBtn.innerText = i18n[currentLang].markupBadge;
    markBtn.onclick = (e) => { e.stopPropagation(); openMarkupModal(item, i); };

    const del = document.createElement('div'); del.className = 'remove-photo-badge'; del.innerText = '✕'; 
    del.onclick = (e) => { e.stopPropagation(); item._photos.splice(i, 1); renderGallery(item); };
    
    box.append(img, markBtn, del); gal.appendChild(box);
  });
}

function compressImage(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = e => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        let w = img.width, h = img.height; if (w > 800 || h > 800) { if (w > h) { h *= 800/w; w = 800; } else { w *= 800/h; h = 800; } }
        const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h; cvs.getContext('2d').drawImage(img, 0, 0, w, h); res(cvs.toDataURL('image/jpeg', 0.65));
      }; img.onerror = rej;
    }; reader.onerror = rej;
  });
}

function calculateTotal(elem) {
  const item = elem.closest('.hq-repair-section') || elem.closest('.update-item');
  const price = parseFloat(item.querySelector('.price-input').value) || 0; 
  item.querySelector('.total-input').value = (item.querySelector('.tax-checkbox') && item.querySelector('.tax-checkbox').checked) ? Math.round(price * 1.05) : price;
}

function addIssueRow() {
  const container = document.getElementById('issueContainer');
  let first = container.querySelector('.issue-item');
  
  if (!first) {
    container.innerHTML = `
      <div class="issue-item border p-3 mb-3 relative">
        <label class="form-label fw-bold text-dark" data-en="Category" data-zh="類別">Category</label>
        <select class="form-select mb-3 category-input"><option>Loading...</option></select>
        <label class="form-label fw-bold text-dark"><span data-en="Issue Description" data-zh="具體問題描述">Issue Description</span> <span class="text-danger">*</span></label>
        <textarea class="form-control mb-3 desc-input" rows="2" data-placeholder-en="Required (e.g., AC leaking...)" data-placeholder-zh="必填 (例如：冷氣漏水...)" placeholder="Required (e.g., AC leaking...)"></textarea>
        <label class="form-label fw-bold text-dark" data-en="On-site Photos (Max 3)" data-zh="現場照片 (最多 3 張)">On-site Photos (Max 3)</label>
        <div class="photo-upload-wrapper mb-2">
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-primary flex-fill fw-bold" onclick="triggerPhotoInput(this, 'camera')" data-en="📷 Take Photo" data-zh="📷 現場拍照">📷 Take Photo</button>
            <button type="button" class="btn btn-sm btn-outline-secondary flex-fill fw-bold" onclick="triggerPhotoInput(this, 'album')" data-en="🖼️ Select Album" data-zh="🖼️ 從相簿選擇">🖼️ Select Album</button>
          </div>
          <input type="file" class="photo-input hidden" accept="image/png, image/jpeg, image/heic, image/webp" multiple onchange="handleMultiPhotoSelect(this)">
          <div class="preview-gallery"></div>
        </div>
        <div class="text-end mt-2"><button type="button" class="btn btn-sm btn-outline-danger remove-btn hidden" onclick="removeIssueRow(this)" data-en="🗑️ Remove Item" data-zh="🗑️ 移除此項">🗑️ Remove Item</button></div>
      </div>`;
    first = container.querySelector('.issue-item');
    first.querySelector('.category-input').innerHTML = categoryOptionsHtml;
    setLanguage(currentLang);
    return;
  }

  const clone = first.cloneNode(true);
  clone._photos = [];
  clone.querySelectorAll('textarea').forEach(t => t.value = '');
  clone.querySelector('.category-input').innerHTML = categoryOptionsHtml;
  clone.querySelector('.preview-gallery').innerHTML = '';
  clone.querySelector('.remove-btn').classList.remove('hidden');
  container.appendChild(clone);
  setLanguage(currentLang);
}

function removeIssueRow(btn) { btn.closest('.issue-item').remove(); }

function showOverlay(txt, pct) { document.getElementById('overlayText').innerText = txt; document.getElementById('overlayProgressBar').style.width = pct + '%'; document.getElementById('overlayProgressBar').innerText = Math.round(pct) + '%'; document.getElementById('fullscreenOverlay').classList.add('show'); }
function hideOverlay() { document.getElementById('fullscreenOverlay').classList.remove('show'); }

function triggerLineShare() {
  if (!liff.isApiAvailable('shareTargetPicker')) {
    if (lastShareData) {
      var summaryText = "🚨 【巡檢與報修通知】\n📍 門市：" + lastShareData.store + "\n👤 提報人：" + lastShareData.empName + "\n🧹 類別：" + lastShareData.category + "\n📝 問題：" + lastShareData.desc + "\n🔗 開啟系統：" + LIFF_URL;
      try { navigator.clipboard.writeText(summaryText); } catch(e){}
    }
    return showToast(i18n[currentLang].shareNotSupported, "error");
  }
  liff.shareTargetPicker([lastSharePayload]).then(res => { if(res) showToast(i18n[currentLang].shareSuccess, "success"); }).catch(console.error);
}

function resetNewForm() {
  document.getElementById('newStoreSelectWrapper').classList.remove('hidden'); document.getElementById('newSectionControls').classList.remove('hidden');
  const container = document.getElementById('issueContainer'); const first = container.querySelector('.issue-item').cloneNode(true);
  first._photos = []; first.querySelectorAll('textarea').forEach(t => t.value = ''); 
  first.querySelector('.category-input').innerHTML = categoryOptionsHtml;
  first.querySelector('.preview-gallery').innerHTML = ''; first.querySelector('.remove-btn').classList.add('hidden');
  container.innerHTML = ''; container.appendChild(first); setLanguage(currentLang);
}

async function submitNew() {
  const store = document.getElementById('newStoreSelect').value; if (!store) return showToast(i18n[currentLang].selectStore, "error");
  const items = document.querySelectorAll('.issue-item');
  for (let i=0; i<items.length; i++) { if (!items[i].querySelector('.desc-input').value.trim()) return showToast(i18n[currentLang].fillDesc(i+1), "error"); }
  
  document.getElementById('submitNewBtn').disabled = true; showOverlay(i18n[currentLang].processing, 10);
  try {
    const issues = []; const photoBatch = [];
    items.forEach(item => { issues.push({ category: item.querySelector('.category-input').value, desc: item.querySelector('.desc-input').value, photosCount: (item._photos||[]).length }); });
    
    showOverlay(i18n[currentLang].savingDb, 30);
    const res = await apiCall('submitNewIssuesText', { store: store, issues: issues, empName: currentUser.empName });
    
    let firstUploadedPhotoId = null; let totalPhotosCount = 0; items.forEach(item => totalPhotosCount += (item._photos||[]).length);
    let processedPhotosCount = 0;

    for (let i = 0; i < items.length; i++) {
      const photos = items[i]._photos || [];
      if (photos.length > 0) {
        const comp = []; 
        for (let p=0; p<photos.length; p++) { 
          processedPhotosCount++;
          let currentPct = 30 + Math.floor((processedPhotosCount / totalPhotosCount) * 50);
          showOverlay(i18n[currentLang].compressingPhoto(p+1, i+1), currentPct); 
          comp.push(await compressImage(photos[p])); 
        }
        photoBatch.push({ eventId: res.eventIds[i].id, photos: comp, targetSheetName: res.eventIds[i].targetSheetName, targetRowIdx: res.eventIds[i].targetRowIdx });
      }
    }
    
    if (photoBatch.length > 0) {
      showOverlay(i18n[currentLang].uploadingPhotos, 85);
      const uploadRes = await apiCall('uploadPhotosInBackground', { submissionMeta: {store:store, issues:issues, empName:currentUser.empName}, photoBatchArray: photoBatch });
      if (uploadRes && uploadRes.firstUploadedFileId) firstUploadedPhotoId = uploadRes.firstUploadedFileId;
    }
    
    showOverlay(i18n[currentLang].successAdd, 100);
    localStorage.removeItem('xmart_offline_draft');
    
    setTimeout(() => {
      var sName = store.includes(' / ') ? store.split(' / ')[1] : store;
      var rawC = issues[0].category; var cName = rawC.split('/').length > 1 ? (rawC.split('/')[1].trim() + " / " + rawC.split('/')[0].trim()) : rawC;

      lastShareData = { store: sName, empName: currentUser.empName || "門市人員", category: cName, desc: issues[0].desc };
      var heroBlock = firstUploadedPhotoId ? { "type": "image", "url": "https://drive.google.com/thumbnail?id=" + firstUploadedPhotoId + "&sz=w800", "size": "full", "aspectRatio": "16:9", "aspectMode": "cover" } : null;

      var bubbleObj = {
        "type": "bubble", "size": "mega",
        "body": { "type": "box", "layout": "vertical", "spacing": "md", "contents": [
          { "type": "text", "text": "🚨 New Issue / 總部巡檢與報修", "weight": "bold", "size": "md", "color": "#dc3545", "wrap": true },
          { "type": "text", "text": "📍 Store / 門市：" + sName, "wrap": true, "size": "sm", "weight": "bold" },
          { "type": "text", "text": "👤 Reporter / 提報人：" + (currentUser.empName || "門市人員"), "wrap": true, "size": "sm" },
          { "type": "text", "text": "🧹 Category / 類別：" + cName, "wrap": true, "size": "sm" },
          { "type": "text", "text": "📝 Issue / 問題：" + issues[0].desc, "wrap": true, "size": "sm" }
        ]},
        "footer": { "type": "box", "layout": "vertical", "contents": [{ "type": "button", "style": "primary", "color": "#6a1b9a", "action": { "type": "uri", "label": "Open / 開啟系統", "uri": LIFF_URL } }] }
      };
      if (heroBlock) bubbleObj.hero = heroBlock;
      lastSharePayload = { "type": "flex", "altText": "🚨 New Issue / 總部巡檢與報修通知", "contents": bubbleObj };

      document.getElementById('newStoreSelectWrapper').classList.add('hidden'); document.getElementById('newSectionControls').classList.add('hidden');
      document.getElementById('issueContainer').innerHTML = `
        <div class="text-center p-4 border rounded fade-in-section" style="background: rgba(255,255,255,0.85); box-shadow: 0 8px 24px rgba(0,0,0,0.06);">
          <div style="font-size: 3.5rem; margin-bottom: 10px;">✅</div>
          <h5 class="fw-bold text-success mb-2" data-en="${i18n.en.successTitle}" data-zh="${i18n.zh.successTitle}">${i18n[currentLang].successTitle}</h5>
          <p class="text-muted small mb-4" data-en="${i18n.en.successSub}" data-zh="${i18n.zh.successSub}">${i18n[currentLang].successSub}</p>
          
          <button type="button" class="btn btn-success w-100 fw-bold shadow-sm mb-3" style="background-color: #06C755; border-color: #06C755; color: white;" onclick="triggerLineShare()" data-en="${i18n.en.shareBtn}" data-zh="${i18n.zh.shareBtn}">
            ${i18n[currentLang].shareBtn}
          </button>
          
          <button type="button" class="btn btn-outline-primary w-100 fw-bold" onclick="resetNewForm()" data-en="${i18n.en.addMoreBtn}" data-zh="${i18n.zh.addMoreBtn}">
            ${i18n[currentLang].addMoreBtn}
          </button>
        </div>`;
      setLanguage(currentLang); hideOverlay(); document.getElementById('submitNewBtn').disabled = false; preloadData();
    }, 500);
  } catch(e) { document.getElementById('submitNewBtn').disabled = false; showError(e); }
}

function fetchPending() {
  const store = document.getElementById('updateStoreSelect').value; if(!store) { document.getElementById('saveUpdateBtn').classList.add('hidden'); return; }
  document.getElementById('pendingContainer').innerHTML = `<div class="skeleton-card"></div>`; document.getElementById('saveUpdateBtn').classList.add('hidden');
  if (globalPendingData) renderPendingData(store, globalPendingData); else { apiCall('getAllPendingIssues').then(data => { globalPendingData = data; renderPendingData(store, data); }).catch(showError); }
}

function selectStatusPill(pillElem, val) {
  const wrapper = pillElem.parentNode; wrapper.querySelectorAll('.pill-opt').forEach(p => p.classList.remove('active'));
  pillElem.classList.add('active'); wrapper.parentNode.querySelector('.status-input').value = val;
}

function renderPendingData(store, allData) {
  const l = i18n[currentLang]; var sName = store.includes(' / ') ? store.split(' / ')[1].trim() : store; var issues = allData.filter(i => i.store.includes(sName));
  if(issues.length === 0) return document.getElementById('pendingContainer').innerHTML = `<div class="alert alert-success text-center mt-3 shadow-sm fade-in-section" style="background-color:#ffca28; color:#212529; border:none; border-radius:14px;"><h5>${l.noPen}</h5></div>`; 
  
  let pendingCount = issues.filter(i => i.status === '未處理').length; let inProgressCount = issues.filter(i => i.status !== '未處理' && i.status !== '已結案').length;
  let html = `
    <div class="micro-dashboard row g-2 text-center mb-4 fade-in-section">
      <div class="col-4"><div class="dash-stat-card p-2" style="background: #fef2f2; border: 1px solid #fecaca;"><div class="dash-num fw-black" style="color: #dc2626 !important;">${pendingCount}</div><div class="dash-label text-dark mt-1">${l.pen}</div></div></div>
      <div class="col-4"><div class="dash-stat-card p-2" style="background: #fffbeb; border: 1px solid #fde68a;"><div class="dash-num fw-black" style="color: #d97706 !important;">${inProgressCount}</div><div class="dash-label text-dark mt-1">${l.pro}</div></div></div>
      <div class="col-4"><div class="dash-stat-card p-2" style="background: #f3e8ff; border: 1px solid #e9d5ff;"><div class="dash-num text-primary fw-black">${issues.length}</div><div class="dash-label text-dark mt-1">${l.tot}</div></div></div>
    </div>`;
  let hasUpdatable = false; const globalVendorHtml = rawVendorDataHtml;
  
  issues.forEach((iss, idx) => {
    let photoHtml = iss.fileId ? `
      <div class="text-center mb-3">
        <img src="https://drive.google.com/thumbnail?id=${iss.fileId}&sz=w800" 
             class="preview-img photo-loaded-anim" 
             onclick="openLightbox(this.src)" 
             onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'text-danger small fw-bold\\'>${l.errLoad}</div>';"
             style="max-width:100%; border-radius:8px; cursor:pointer;">
      </div>` : `<div class="alert alert-secondary text-center p-2 small mb-3" style="border-radius: 8px;">${l.noP}</div>`;

    let isRep = iss.sheetName === '設備報修紀錄' || iss.category.includes("設備與系統異常"); let isRO = isRep && !currentUser.isHQ; let hqHtml = '';
    if (isRep && currentUser.isHQ) {
      let vOpt = globalVendorHtml; if (globalVendorHtml.includes(`value="${iss.vendor}"`)) vOpt = globalVendorHtml.replace(`value="${iss.vendor}"`, `value="${iss.vendor}" selected`); else if (iss.vendor) vOpt += `<option value="${iss.vendor}" selected>${iss.vendor}</option>`;
      hqHtml = `
        <div class="hq-repair-section shadow-sm">
          <h6 class="fw-bold text-dark mb-3">${l.hqDet} <span class="hq-badge">${l.hqB}</span></h6>
          <div class="form-check form-switch mb-3"><input class="form-check-input severity-input" type="checkbox" ${iss.severity ? 'checked' : ''}><label class="form-check-label fw-bold text-danger">${l.urg}</label></div>
          <label class="form-label fw-bold text-dark small">${l.eqN}</label><input type="text" class="form-control mb-2 equip-input" value="${iss.equipName}">
          <label class="form-label fw-bold text-dark small">${l.ven}</label><select class="form-select mb-2 vendor-input">${vOpt}</select>
          <label class="form-label fw-bold text-dark small">${l.rLog}</label><textarea class="form-control mb-2 repair-desc-input" rows="2">${iss.repairDesc}</textarea>
          <label class="form-label fw-bold text-dark small">${l.mat}</label><input type="text" class="form-control mb-2 materials-input" value="${iss.materials||''}">
          <label class="form-label fw-bold text-dark small">${l.war}</label><input type="text" class="form-control mb-2 warranty-input" value="${iss.warranty}">
          <div class="row g-2 mb-2 align-items-end">
            <div class="col-5"><label class="form-label fw-bold text-dark small">${l.pri}</label><input type="number" class="form-control price-input" value="${iss.price}" oninput="calculateTotal(this)"></div>
            <div class="col-3 pb-2"><div class="form-check"><input class="form-check-input tax-checkbox" type="checkbox" onchange="calculateTotal(this)"><label class="form-check-label small">+5% Tax</label></div></div>
            <div class="col-4"><label class="form-label fw-bold text-danger small">${l.total}</label><input type="number" class="form-control total-input text-danger fw-bold" value="${iss.total}" readonly style="background: #ffffff !important;"></div>
          </div>
        </div>`;
    }
    
    let sList = isRep ? ["未處理","已聯繫/待派工","已排程","觀察中","已結案"] : ["未處理","處理中","已結案"];
    let pills = sList.map(opt => `<div class="pill-opt ${iss.status===opt?'active':''} ${opt==='已結案'?'pill-status-closed':(opt==='未處理'?'pill-status-pending':'pill-status-progress')}" onclick="selectStatusPill(this, '${opt}')">${statDict[opt]?statDict[opt][currentLang]:opt}</div>`).join('');
    let interact = ''; let cls = isRO ? 'readonly-item' : 'update-item'; let tStat = statDict[iss.status] ? statDict[iss.status][currentLang] : iss.status; let bCls = iss.status==="已結案" ? "badge-soft-success" : (iss.status!=="未處理" ? "badge-soft-warning" : "badge-soft-danger"); let sIco = iss.status==="已結案" ? "🟢" : (iss.status!=="未處理" ? "🟡" : "🔴");
    
    if (isRO) { 
      interact = `<div class="mt-3 p-3 rounded border border-warning" style="background: #fff8e1;"><h6 class="fw-bold text-warning mb-2">🔒 門市唯讀</h6><label class="form-label fw-bold text-dark small">總部處理進度</label><div class="mb-2 text-dark">${iss.progress ? iss.progress.replace(/\n/g,'<br>') : '-'}</div><span class="badge-soft ${bCls}">${sIco} ${tStat}</span></div>`; 
    } else { 
      hasUpdatable = true; 
      interact = `
        <label class="form-label mt-2 fw-bold text-success">${l.prog}</label><textarea class="form-control progress-input" rows="2" placeholder="Update...">${iss.progress}</textarea>
        ${hqHtml}
        <label class="form-label mt-3 fw-bold text-success">${l.uP} <span class="text-danger">${l.reqC}</span></label>
        <div class="photo-upload-wrapper mb-2">
          <div class="d-flex gap-2 mb-2">
            <button type="button" class="btn btn-sm btn-outline-success flex-fill fw-bold" onclick="triggerPhotoInput(this, 'camera')">📷 Take Photo</button>
            <button type="button" class="btn btn-sm btn-outline-secondary flex-fill fw-bold" onclick="triggerPhotoInput(this, 'album')">🖼️ Select Album</button>
          </div>
          <input type="file" class="hidden" accept="image/*" multiple onchange="handleMultiPhotoSelect(this)">
          <div class="preview-gallery"></div>
        </div>
        <label class="form-label mt-3 fw-bold text-success">${l.st}</label>
        <input type="hidden" class="status-input" value="${iss.status}">
        <div class="segmented-control">${pills}</div>`; 
    }
    
    let k = iss.category.split('/')[0].trim(); let dCat = catDict[k] ? catDict[k][currentLang] : k;
    html += `
      <div class="p-3 mb-4 rounded ${cls} stagger-card" style="animation-delay: ${(idx * 0.07).toFixed(2)}s;" data-row="${iss.row}" data-sheet="${iss.sheetName}" data-is-repair="${isRep}">
        <div class="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2" style="border-bottom: 1px solid #f3f4f6 !important;">
          <div>
            <span class="badge-soft badge-soft-purple me-1">${dCat}</span>
            <h6 class="text-dark fw-bold d-inline-block mb-0">${iss.desc}</h6>
            <div class="text-muted small mt-1">ID: ${iss.eventId}</div>
          </div>
          <div class="text-end">
            <span class="badge-soft ${bCls} mb-1">${sIco} ${tStat}</span>
            <small class="text-muted d-block" style="font-size: 0.72rem; white-space: nowrap;">🕒 ${iss.time}</small>
          </div>
        </div>
        ${photoHtml} 
        ${interact}
      </div>`;
  });
  
  document.getElementById('pendingContainer').innerHTML = html; document.getElementById('saveUpdateBtn').classList.toggle('hidden', !hasUpdatable);
}

async function submitUpdates() {
  const l = i18n[currentLang]; document.getElementById('saveUpdateBtn').disabled = true; const items = document.querySelectorAll('.update-item');
  if (items.length === 0) { document.getElementById('saveUpdateBtn').disabled = false; return; }
  for (let i=0; i<items.length; i++) { if (items[i].querySelector('.status-input').value === '已結案' && (items[i]._photos||[]).length === 0) { showToast(l.reqC, 'error'); document.getElementById('saveUpdateBtn').disabled = false; return; } }
  
  showOverlay(l.preparingUpdate, 20); const updates = []; const photoUpdates = [];
  for (let i=0; i<items.length; i++) {
    const item = items[i]; const p = item._photos || []; const isR = item.getAttribute('data-is-repair') === 'true';
    let uData = { sheetName: item.getAttribute('data-sheet'), row: item.getAttribute('data-row'), progress: item.querySelector('.progress-input').value, status: item.querySelector('.status-input').value, hasPhoto: p.length>0, isHQ: currentUser.isHQ };
    let mData = null;
    if (isR && currentUser.isHQ) {
      uData.severity = item.querySelector('.severity-input').checked ? "是" : ""; uData.equipName = item.querySelector('.equip-input').value; uData.vendor = item.querySelector('.vendor-input').value; uData.repairDesc = item.querySelector('.repair-desc-input').value; uData.materials = item.querySelector('.materials-input').value; uData.warranty = item.querySelector('.warranty-input').value; uData.price = item.querySelector('.price-input').value; uData.total = item.querySelector('.total-input').value;
      const rW = item.querySelector('.hq-repair-section'); const rP = rW ? (rW._photos || []) : [];
      if (rP.length > 0) { uData.hasReceipt = true; mData = {sheetName:uData.sheetName, row:uData.row}; showOverlay(l.compressingReceipt, 40); mData.receiptData = await compressImage(rP[0]); }
    }
    updates.push(uData);
    if (p.length > 0) { if(!mData) mData = {sheetName:uData.sheetName, row:uData.row}; showOverlay(`Compressing photo...`, 50); mData.photoData = await compressImage(p[0]); }
    if (mData) photoUpdates.push(mData);
  }
  
  try {
    showOverlay(l.savingDbUpdate, 70);
    const msg = await apiCall('updateIssuesText', { updates: updates, empName: currentUser.empName });
    if (photoUpdates.length > 0) { showOverlay("Uploading update photos...", 90); await apiCall('uploadUpdatePhotosInBackground', { updates: photoUpdates }); }
    showOverlay(l.successUpdate, 100); setTimeout(() => { showToast(msg, 'success'); hideOverlay(); globalPendingData = null; preloadData(); fetchPending(); document.getElementById('saveUpdateBtn').disabled = false; }, 600);
  } catch (e) { document.getElementById('saveUpdateBtn').disabled = false; showError(e); }
}