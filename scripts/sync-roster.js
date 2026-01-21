const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [진단] PSK 수신 상태 체크 ---");
  console.log("PSK 존재 여부:", PSK ? "✅ 수신 성공" : "❌ 수신 실패 (Secret 이름을 확인하세요)");
  console.log("-------------------------------");

  if (!PSK) return;

  try {
    console.log("PandaScore에서 2026 LCK 시즌 데이터를 가져오는 중...");
    
    const response = await axios.get('https://api.pandascore.co/lol/seasons/current', {
      params: { 'filter[league_id]': 293 },
      headers: { 'Authorization': `Bearer ${PSK}` }
    });

    if (!response.data || response.data.length === 0) {
      console.log("현재 진행 중인 시즌 데이터를 찾을 수 없습니다.");
      return;
    }

    const teams = response.data[0].teams;
    console.log(`확인된 팀 수: ${teams.length}개. DB 동기화를 시작합니다.`);

    for (const team of teams) {
      for (const p of team.players) {
        const { error } = await supabase.from('players').upsert({
          name: p.name,
          position: p.role || 'Unknown',
          team_name: team.name,
          image_url: p.image_url
        }, { onConflict: 'name' });

        if (error) console.error(`저장 실패 (${p.name}):`, error.message);
      }
    }
    console.log("🎉 2026 LCK 로스터 동기화 완료!");
  } catch (err) {
    console.error("API 호출 중 오류 발생:", err.response?.data?.error || err.message);
  }
}

sync();
