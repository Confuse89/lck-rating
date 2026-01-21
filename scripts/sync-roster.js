const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [긴급 진단] ---");
  console.log("전달받은 PSK 값 길이:", PSK ? PSK.length : "0 (데이터 없음)");
  console.log("------------------");

  if (!PSK || PSK.length < 5) {
    console.error("❌ 실패: GitHub에서 API 키를 가져오지 못했습니다. Secret 이름을 확인하세요.");
    return;
  }

  try {
    const response = await axios.get('https://api.pandascore.co/lol/players', {
      params: { 'filter[league_id]': 293, 'per_page': 100 },
      headers: { 'Authorization': `Bearer ${PSK.trim()}` } // 공백 제거 추가
    });

    console.log(`✅ 성공: PandaScore에서 ${response.data.length}명의 데이터를 수신했습니다.`);
    // ... (이후 저장 로직 동일)
  } catch (err) {
    console.error("❌ API 호출 오류:", err.response?.data?.error || err.message);
  }
}
sync();
