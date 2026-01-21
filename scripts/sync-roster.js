const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [LCK 데이터 동기화 시작] ---");
  
  try {
    const response = await axios.get('https://api.pandascore.co/lol/teams', {
      params: { 
        'filter[league_id]': 293,
        'per_page': 50 
      },
      headers: { 
        'Authorization': `Bearer ${PSK.trim()}`,
        'Accept': 'application/json'
      }
    });

    const teams = response.data;
    console.log(`✅ LCK 팀 수신 성공: ${teams.length}개 팀 확인`);

    let totalSaved = 0;

    for (const team of teams) {
      if (team.players && team.players.length > 0) {
        console.log(`[${team.name}] 로스터 저장 중... (${team.players.length}명)`);
        
        for (const p of team.players) {
          const { error } = await supabase.from('players').upsert({
            name: p.name,
            position: p.role || 'Unknown',
            team_name: team.name,
            image_url: p.image_url
          }, { onConflict: 'name' });

          if (!error) totalSaved++;
        }
      }
    }
    
    console.log(`\n🎉 동기화 완료! 총 ${totalSaved}명의 선수가 Supabase에 업데이트되었습니다.`);

  } catch (err) {
    if (err.response) {
      console.error("❌ API 오류 발생:");
      console.error("상태 코드:", err.response.status);
      console.error("상세 내용:", JSON.stringify(err.response.data));
    } else {
      console.error("❌ 네트워크 오류:", err.message);
    }
  }
}

sync();
