const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [세계 로스터 수집] ---");
  
  const targetLeagueIds = [293, 294, 4198, 4197, 4201, 4200, 4199]; 

  try {
    let totalSaved = 0;

    const response = await axios.get('https://api.pandascore.co/lol/teams', {
      params: { 
        'filter[league_id]': targetLeagueIds.join(','),
        'per_page': 100 
      },
      headers: { 'Authorization': `Bearer ${PSK.trim()}` }
    });

    const teams = response.data;
    console.log(`🔎 총 ${teams.length}개의 팀을 찾았습니다.`);

    for (const team of teams) {
      console.log(`📡 [${team.name}] 로스터 수집 중...`);
      
      const detailResponse = await axios.get(`https://api.pandascore.co/teams/${team.id}`, {
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const players = detailResponse.data.players;

      if (players && players.length > 0) {
        for (const p of players) {
          const { error } = await supabase.from('players').upsert({
            name: p.name,
            position: p.role || 'Unknown',
            team_name: team.name,
            image_url: p.image_url,
            team_id: team.id
          }, { onConflict: 'name' });

          if (!error) totalSaved++;
        }
      }
    }
    
    console.log(`\n🎉 완료: 선수 총 ${totalSaved}명 저장 성공!`);

  } catch (err) {
    console.error("❌ 수집 실패:", err.response?.data || err.message);
  }
}

sync();
