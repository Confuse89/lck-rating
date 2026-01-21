const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function sync() {
  console.log("--- [LoL 로스터 동기화 시작] ---");
  
  let totalSaved = 0;
  const pages = [1, 2];

  try {
    for (const page of pages) {
      console.log(`📡 페이지 ${page} 데이터 요청 중...`);
      
      const response = await axios.get('https://api.pandascore.co/lol/teams', {
        params: { 
          'per_page': 100,
          'page': page,
          'sort': '-id'
        },
        headers: { 'Authorization': `Bearer ${PSK.trim()}` }
      });

      const teams = response.data;
      console.log(`📦 페이지 ${page}: ${teams.length}개의 팀을 수신했습니다.`);

      for (const team of teams) {
        if (team.players && team.players.length > 0) {
          console.log(`📥 [${team.name}] (ID: ${team.id}) 저장 중...`);
          
          for (const p of team.players) {
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
    }
    
    console.log(`\n🎉 완료: 총 ${totalSaved}명의 선수 데이터가 Supabase에 저장되었습니다.`);

  } catch (err) {
    console.error("❌ 데이터 수집 중 오류 발생:", err.response?.data || err.message);
    if (err.response?.status === 401) {
      console.log("💡 PSK(API Key) 인증 오류가 확인되었습니다. GitHub Secrets를 확인해 주세요.");
    }
  }
}

sync();
