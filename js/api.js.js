/* ------------------------------------------------------------------------- */
/* [FULL API MODULE - ZERO TRUNCATION / 完整網路傳輸腳本]                    */
/* ------------------------------------------------------------------------- */
async function apiCall(action, params = {}) {
  params.action = action;
  try {
    const res = await fetch(GAS_API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(params) });
    const json = await res.json();
    if (json.status === 'error') throw new Error(json.message);
    return json.data;
  } catch (err) { throw new Error("API 傳輸失敗: " + err.message); }
}