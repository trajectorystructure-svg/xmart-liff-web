/* ------------------------------------------------------------------------- */
/* [FULL CONFIG - ZERO TRUNCATION / 完整常數與多國語言字典設定]              */
/* ------------------------------------------------------------------------- */
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyhTINfMK_pxjBS1PDNz0sI9wfK_e_dj4yMreHMiGiciFFhKBQ2PfBYo14djV0OZVOL/exec"; 
const LIFF_ID = "2011299031-XyatqEOs"; 
const LIFF_URL = "https://liff.line.me/" + LIFF_ID;

let globalPendingData = null, lastSharePayload = null, lastShareData = null, currentUser = { empName: "", store: "", isHQ: false }, lineProfile = null;
let rawStoreDataHtml = "", rawVendorDataHtml = "", categoryOptionsHtml = "";

function safeGetStorage(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }
function safeSetStorage(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }

let currentLang = safeGetStorage('xmart_lang') || 'zh';

let activeItemForMarkup = null, activePhotoIndexForMarkup = -1;
let canvas, ctx, isDrawing = false, originalImageObj = null;

const catDict = { 
  "設備與系統異常": { en: "Equipment & System", zh: "設備與系統異常" }, 
  "環境清潔": { en: "Environmental Cleaning", zh: "環境清潔" }, 
  "定期消毒": { en: "Regular Disinfection", zh: "定期消毒" }, 
  "人員紀律": { en: "Personnel Discipline", zh: "人員紀律" }, 
  "商品陳列": { en: "Merchandising & Display", zh: "商品陳列" }, 
  "商品陳列與標示": { en: "Merchandising & Display", zh: "商品陳列與標示" }, 
  "食品安全": { en: "Food Safety", zh: "食品安全" }, 
  "客訴處理": { en: "Customer Complaint", zh: "客訴處理" }, 
  "其他": { en: "Other", zh: "其他" } 
};

const statDict = { 
  "未處理": { en: "Pending", zh: "未處理" }, 
  "已聯繫/待派工": { en: "Contacted", zh: "已聯繫/待派工" }, 
  "已排程": { en: "Scheduled", zh: "已排程" }, 
  "觀察中": { en: "Observing", zh: "觀察中" }, 
  "處理中": { en: "Processing", zh: "處理中" }, 
  "已結案": { en: "Closed", zh: "已結案" } 
};

const i18n = { 
  en: {
    max3Photos: "Maximum 3 photos allowed", selectStore: "Please select a store!", fillDesc: (i) => `Please fill description for item ${i}!`,
    processing: "🚀 Processing...", savingDb: "📤 Saving to DB...", compressingPhoto: (p, i) => `Compressing photo ${p} for item ${i}...`,
    uploadingPhotos: "🖼️ Uploading...", successAdd: "✅ Success!", photoRequiredToClose: "⚠️ Photo required to close!",
    preparingUpdate: "🚀 Preparing...", compressingReceipt: "Compressing receipt...", savingDbUpdate: "💾 Saving...", successUpdate: "✅ Saved!",
    noPen: "🎉 No pending issues!", errLoad: "Photo load failed", noP: "No photo attached", hqDet: "🛠️ HQ Details", hqB: "HQ Only", urg: "Urgent", eqN: "Equipment", ven: "Vendor", rLog: "Log", mat: "Materials", war: "Warranty", pri: "Price", total: "Total", uP: "Completion Photos", st: "Status", prog: "Progress", reqC: "*Required",
    pen: "🚨 Pending", pro: "⏳ Progress", tot: "📋 Total", incompleteData: "Incomplete data! Please set name and store.", confirmReset: "Are you sure you want to reset your account and re-select your store?",
    shareBtn: "📢 Share via LINE", addMoreBtn: "➕ Add Another Issue", successTitle: "Successfully Submitted!", successSub: "Your report has been saved.",
    shareSuccess: "✅ Successfully shared!", shareNotSupported: "Share API unavailable. Summary copied to clipboard!",
    markupBadge: "✏️ Markup", draftSavedToast: "Draft saved locally!", draftRestoredToast: "Draft restored!", markupAppliedToast: "Markup applied successfully!",
    draftBannerTitle: "📁 Offline Draft Found", loadDraftBtn: "Load Draft", saveDraftBtn: "💾 Save Draft", markupModalTitle: "✏️ Photo Markup", clearCanvasBtn: "🔄 Clear", cancelBtn: "Cancel", applyMarkupBtn: "💾 Apply",
    syncingData: "🔄 Syncing data from cloud..."
  }, 
  zh: {
    max3Photos: "每項最多可上傳 3 張照片", selectStore: "請選擇門市！", fillDesc: (i) => `請填寫第 ${i} 筆描述！`,
    processing: "🚀 處理中...", savingDb: "📤 寫入資料庫...", compressingPhoto: (p, i) => `壓縮第 ${i} 項照片 ${p}...`,
    uploadingPhotos: "🖼️ 上傳照片中...", successAdd: "✅ 新增成功！", photoRequiredToClose: "⚠️ 結案務必上傳完工照！",
    preparingUpdate: "🚀 準備更新...", compressingReceipt: "壓縮單據...", savingDbUpdate: "💾 寫入資料庫...", successUpdate: "✅ 更新成功！",
    noPen: "🎉 太棒了！無待處理案件！", errLoad: "照片載入失敗", noP: "無附照片", hqDet: "🛠️ 總部維修專區", hqB: "總部專用", urg: "嚴重影響營運 (Urgent)", eqN: "設備名稱", ven: "廠商與聯絡人", rLog: "維修紀錄", mat: "使用耗材", war: "保固時間", pri: "未稅金額", total: "總計金額", uP: "完工照片", st: "處理狀態", prog: "處理進度", reqC: "*結案必填",
    pen: "🚨 待處理", pro: "⏳ 處理中", tot: "📋 總件數", incompleteData: "資料不完整！請輸入姓名並選擇負責門市。", confirmReset: "確定要清除帳號記憶，重新綁定身分與門市嗎？",
    shareBtn: "📢 分享至 LINE 聯絡人/群組", addMoreBtn: "➕ 繼續新增其他異常", successTitle: "新增成功！", successSub: "您的巡檢異常已成功送出並建立紀錄。",
    shareSuccess: "✅ 已成功分享！", shareNotSupported: "目前環境不支援 LINE 分享，已自動將通報內容複製至剪貼簿！",
    markupBadge: "✏️ 標記", draftSavedToast: "草稿已暫存於手機！", draftRestoredToast: "已還原草稿！", markupAppliedToast: "已成功套用紅圈標記！",
    draftBannerTitle: "📁 發現離線暫存草稿", loadDraftBtn: "讀取草稿", saveDraftBtn: "💾 暫存草稿", markupModalTitle: "✏️ 照片畫布標記", clearCanvasBtn: "🔄 清除畫布", cancelBtn: "取消", applyMarkupBtn: "💾 儲存套用",
    syncingData: "🔄 正在從雲端同步案件資料..."
  } 
};