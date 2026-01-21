const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [데이터 수신 단계] ---");
  
  try {
    const response = await axios.get('https://api.pandascore.co/lol/players', {
      params: { 
        'filter[league_id]': 293,
        'sort': 'name',
        'per_page': 100 
      },
      headers: { 
        'Authorization': `Bearer ${PSK.trim()}`,
        'Accept': 'application/json'
      }
    });

    const players = response.data;
    console.log(`✅ 데이터 수신 성공: ${players.length}명의 선수를 발견했습니다.`);

    if (players.length === 0) {
      console.warn("데이터가 비어있습니다. 현재 시즌 정보가 업데이트 중일 수 있습니다.");
      return;
    }

    for (const p of players) {
      if (p.current_team) {
        const { error } = await supabase.from('players').upsert({
          name: p.name,
          position: p.role || 'Unknown',
          team_name: p.current_team.name,
          image_url: p.image_url
        }, { onConflict: 'name' });

        if (error) console.error(`DB 저장 실패 (${p.name}):`, error.message);
      }
    }
    
    console.log("🎉 로스터 정보가 Supabase에 저장되었습니다!");

  } catch (err) {
    if (err.response) {
      console.error("❌ API 오류 발생:");
      console.error("상태 코드:", err.response.status);
      console.error("오류 메시지:", JSON.stringify(err.response.data));
    } else {
      console.error("❌ 네트워크 오류:", err.message);
    }
  }
}

sync();
