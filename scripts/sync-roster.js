const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [리그 로스터 수집 시작] ---");
  
  const targetLeagues = [
    { id: 293, name: 'LCK' },
    { id: 294, name: 'LPL' },
    { id: 4198, name: 'LEC' },
    { id: 4197, name: 'LCS' },
    { id: 4201, name: 'LCK CL' }
  ];

  try {
    let totalSaved = 0;

    for (const league of targetLeagues) {
      console.log(`📡 [${league.name}] 리그 소속 팀 목록 가져오는 중...`);
      
      const response = await axios.get(`https://api.pandascore.co/leagues/${league.id}/teams`, {
        params: { 'per_page': 50 },
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const teams = response.data;
      console.log(`🔎 [${league.name}]에서 ${teams.length}개의 팀을 발견했습니다.`);

      for (const team of teams) {
        try {
          const detailResponse = await axios.get(`https://api.pandascore.co/teams/${team.id}`, {
            headers: { 'Authorization': `Bearer ${PSK.trim()}` }
          });

          const players = detailResponse.data.players;

          if (players && players.length > 0) {
            console.log(`✅ [${team.name}] 선수 ${players.length}명 저장 중...`);
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
        } catch (e) {
          continue;
        }
      }
    }
    
    console.log(`\n🎉 완료: 리그 선수 총 ${totalSaved}명 저장 성공!`);

  } catch (err) {
    console.error("❌ 치명적 오류:", err.response?.data || err.message);
  }
}

sync();
