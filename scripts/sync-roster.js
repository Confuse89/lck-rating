const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncRoster() {
  console.log("LCK 선수 중심 동기화 시작...");
  try {
    const url = "https://lol.fandom.com/api.php";
    const params = {
      action: "cargoquery",
      format: "json",
      tables: "Players",
      fields: "ID, CurrentTeam, Role, Image",
      where: "Region = 'Korea' AND CurrentTeam IS NOT NULL", 
      limit: 250
    };

    const response = await axios.get(url, { params });
    
    if (!response.data || !response.data.cargoquery) {
        console.log("API 응답이 비어있습니다.");
        return;
    }

    const players = response.data.cargoquery.map(item => item.title);

    console.log(`총 ${players.length}명의 선수를 발견했습니다. DB 업로드를 시작합니다.`);

    for (const p of players) {
      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.ID,
          position: p.Role,
          team_name: p.CurrentTeam,
          image_url: p.Image ? `https://lol.fandom.com/wiki/Special:FilePath/${p.Image}` : null
        }, { onConflict: 'name' });
        
      if (error) console.error(`저장 실패: ${p.ID}`, error);
    }
    
    console.log("모든 선수의 로스터 동기화가 완료되었습니다!");
  } catch (err) {
    console.error("실행 중 오류 발생:", err.message);
    process.exit(1);
  }
}

syncRoster();
