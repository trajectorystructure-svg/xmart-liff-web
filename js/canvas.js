/* ------------------------------------------------------------------------- */
/* [FULL CANVAS MODULE - ZERO TRUNCATION / 完整照片畫布標記腳本]              */
/* ------------------------------------------------------------------------- */
function initCanvasEvents() {
  canvas = document.getElementById('markupCanvas'); ctx = canvas.getContext('2d');
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };
  const startDraw = (e) => { isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  const draw = (e) => { if (!isDrawing) return; const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke(); };
  const stopDraw = () => { isDrawing = false; };

  canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('touchstart', startDraw); canvas.addEventListener('touchmove', draw); canvas.addEventListener('touchend', stopDraw);
}

function openMarkupModal(item, photoIdx) {
  activeItemForMarkup = item; activePhotoIndexForMarkup = photoIdx;
  const file = item._photos[photoIdx]; const reader = new FileReader();
  reader.onload = (e) => {
    originalImageObj = new Image();
    originalImageObj.onload = () => {
      canvas.width = originalImageObj.width; canvas.height = originalImageObj.height;
      ctx.drawImage(originalImageObj, 0, 0); document.getElementById('markupModal').classList.add('show');
    };
    originalImageObj.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearMarkupCanvas() { if (originalImageObj) ctx.drawImage(originalImageObj, 0, 0); }
function closeMarkupModal() { document.getElementById('markupModal').classList.remove('show'); }
function saveMarkupCanvas() {
  canvas.toBlob((blob) => {
    const newFile = new File([blob], "markup.jpg", { type: "image/jpeg" });
    activeItemForMarkup._photos[activePhotoIndexForMarkup] = newFile;
    renderGallery(activeItemForMarkup); closeMarkupModal(); showToast(i18n[currentLang].markupAppliedToast);
  }, 'image/jpeg', 0.85);
}