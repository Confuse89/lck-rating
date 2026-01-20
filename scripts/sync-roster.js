const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PANDA_TOKEN = process.env.PANDASCORE_API_KEY;

async function syncWithPandaScore() {
  console.log("PandaScore를 통해 LCK 로스터 동기화 시작...");
  
  try {
    const response = await axios.get('https://api.pandascore.co/lol/players', {
      params: {
        'filter[league_id]': 293, // LCK 공식 리그 ID
        'per_page': 100
      },
      headers: { 'Authorization': `Bearer ${PANDA_TOKEN}` }
    });

    const players = response.data;

    if (!players || players.length === 0) {
      console.log("데이터를 찾지 못했습니다. API 키나 리그 ID를 확인하세요.");
      return;
    }

    console.log(`PandaScore에서 ${players.length}명의 선수를 불러왔습니다.`);

    for (const p of players) {
      if (!p.current_team) continue;

      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.name,
          position: p.role,
          team_name: p.current_team.name,
          image_url: p.image_url // PandaScore에서 제공하는 공식 선수 이미지
        }, { onConflict: 'name' });

      if (error) console.error(`DB 저장 에러 (${p.name}):`, error.message);
    }

    console.log("🎉 PandaScore 기반 실제 로스터 동기화 완료!");
  } catch (err) {
    console.error("동기화 중 오류:", err.message);
  }
}

syncWithPandaScore();
