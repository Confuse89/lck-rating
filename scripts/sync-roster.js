const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncRoster() {
  console.log("LCK 선수 데이터 검증 및 동기화 시작...");
  try {
    const url = "https://lol.fandom.com/api.php";
    const params = {
      action: "cargoquery",
      format: "json",
      tables: "Players",
      fields: "ID, CurrentTeam, Role, Image",
      where: "Region = 'Korea' AND CurrentTeam IS NOT NULL", 
      limit: 200
    };

    const response = await axios.get(url, { params });
    
    if (!response.data || !response.data.cargoquery) {
      console.error("API 응답 구조가 올바르지 않습니다.");
      return;
    }

    const players = response.data.cargoquery.map(item => item.title);
    console.log(`검증 완료: 총 ${players.length}명의 한국 활동 선수를 발견했습니다.`);

    for (const p of players) {
      // Supabase에 데이터 저장
      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.ID,
          position: p.Role,
          team_name: p.CurrentTeam,
          image_url: p.Image ? `https://lol.fandom.com/wiki/Special:FilePath/${p.Image.replace(/\s/g, '_')}` : null
        }, { onConflict: 'name' });
        
      if (error) console.error(`저장 실패 (${p.ID}):`, error.message);
    }
    
    console.log("🎉 모든 로스터가 Supabase에 성공적으로 저장되었습니다!");
  } catch (err) {
    console.error("동기화 중 치명적 오류:", err.message);
    process.exit(1);
  }
}

syncRoster();
