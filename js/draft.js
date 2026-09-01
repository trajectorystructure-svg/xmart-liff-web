/* ------------------------------------------------------------------------- */
/* [FULL DRAFT MODULE - ZERO TRUNCATION / 完整離線草稿儲存與防護腳本]         */
/* ------------------------------------------------------------------------- */
function saveCurrentAsDraft() {
  const store = document.getElementById('newStoreSelect').value;
  const items = Array.from(document.querySelectorAll('.issue-item')).map(item => ({ category: item.querySelector('.category-input').value, desc: item.querySelector('.desc-input').value }));
  safeSetStorage('xmart_offline_draft', JSON.stringify({ store: store, issues: items, time: new Date().toLocaleString() }));
  showToast(i18n[currentLang].draftSavedToast); checkOfflineDrafts();
}

function checkOfflineDrafts() {
  const draft = safeGetStorage('xmart_offline_draft');
  if (draft) {
    try {
      const d = JSON.parse(draft);
      const infoText = currentLang === 'en' ? `Saved at ${d.time} (${d.issues.length} record(s))` : `暫存於 ${d.time} (${d.issues.length} 筆紀錄)`;
      document.getElementById('draftBannerInfo').innerText = infoText;
      document.getElementById('draftBanner').classList.remove('hidden');
    } catch(e){}
  }
}

function restoreDraft() {
  const draft = safeGetStorage('xmart_offline_draft'); if(!draft) return;
  try {
    const d = JSON.parse(draft);
    if(!d.issues || d.issues.length === 0) return;
    if(d.store) document.getElementById('newStoreSelect').value = d.store;

    const container = document.getElementById('issueContainer');
    const existingRow = container.querySelector('.issue-item');
    let templateNode = existingRow ? existingRow.cloneNode(true) : null;

    container.innerHTML = '';

    d.issues.forEach((iss, i) => {
      let newRow;
      if (templateNode) {
        newRow = templateNode.cloneNode(true);
      } else {
        addIssueRow();
        const rows = container.querySelectorAll('.issue-item');
        newRow = rows[rows.length - 1];
      }

      newRow._photos = [];
      const descInput = newRow.querySelector('.desc-input');
      const catInput = newRow.querySelector('.category-input');
      const gallery = newRow.querySelector('.preview-gallery');
      
      if (descInput) descInput.value = iss.desc || '';
      if (catInput) {
        catInput.innerHTML = categoryOptionsHtml;
        catInput.value = iss.category || '';
      }
      if (gallery) gallery.innerHTML = '';

      const removeBtn = newRow.querySelector('.remove-btn');
      if (removeBtn) {
        if (i === 0 && d.issues.length === 1) removeBtn.classList.add('hidden');
        else removeBtn.classList.remove('hidden');
      }

      if (templateNode) container.appendChild(newRow);
    });

    localStorage.removeItem('xmart_offline_draft');
    document.getElementById('draftBanner').classList.add('hidden');
    setLanguage(currentLang);
    showToast(i18n[currentLang].draftRestoredToast);
  } catch (err) {
    showToast("草稿還原失敗: " + err.message, "error");
  }
}