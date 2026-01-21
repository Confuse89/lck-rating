const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [팀 탐색 및 필터링 시작] ---");
  
  try {
    const response = await axios.get('https://api.pandascore.co/lol/teams', {
      params: { 
        'filter[league_id]': 293, 
        'per_page': 100 
      },
      headers: { 'Authorization': `Bearer ${PSK.trim()}` }
    });

    const teams = response.data;
    console.log(`🔎 총 ${teams.length}개의 팀 데이터를 수신했습니다.`);

    let totalSaved = 0;

    for (const team of teams) {
      if (team.players && team.players.length > 0) {
        console.log(`✅ [${team.name}] (ID: ${team.id}) 선수를 저장합니다...`);
        
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
    
    console.log(`\n🎉 완료: 총 ${totalSaved}명의 LCK 선수가 Supabase에 등록되었습니다.`);

  } catch (err) {
    console.error("❌ 필터링 요청 실패, 전체 데이터 수집 모드로 전환합니다...");
    await fetchAllTeamsFallback();
  }
}

async function fetchAllTeamsFallback() {
  const response = await axios.get('https://api.pandascore.co/lol/teams', {
    params: { 'per_page': 100 },
    headers: { 'Authorization': `Bearer ${PSK.trim()}` }
  });
  
}

sync();
