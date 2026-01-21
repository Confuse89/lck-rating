const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [로스터 동기화 실행] ---");
  
  const lckTeamIds = [126061, 126444, 126161, 126214, 125751, 126155, 126021, 126166, 126022, 126636];

  try {
    const response = await axios.get('https://api.pandascore.co/lol/teams', {
      params: { 
        'filter[id]': lckTeamIds.join(','),
        'per_page': 100 
      },
      headers: { 'Authorization': `Bearer ${PSK.trim()}` }
    });

    const teams = response.data;
    let totalSaved = 0;

    for (const team of teams) {
      if (lckTeamIds.includes(team.id) && team.players && team.players.length > 0) {
        console.log(`✅ [${team.name}] 선수 ${team.players.length}명 저장 중...`);
        
        for (const p of team.players) {
          await supabase.from('players').upsert({
            name: p.name,
            position: p.role || 'Unknown',
            team_name: team.name,
            image_url: p.image_url
          }, { onConflict: 'name' });
          totalSaved++;
        }
      }
    }
    
    console.log(`\n🎉 성공: 총 ${totalSaved}명의 LCK 선수가 Supabase에 등록되었습니다.`);

  } catch (err) {
    console.error("❌ 오류 발생:", err.response?.data || err.message);
  }
}

sync();
