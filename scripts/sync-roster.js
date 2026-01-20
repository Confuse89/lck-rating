const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncRoster() {
  console.log("LCK 선수 데이터 동기화 시작...");
  try {
    const url = "https://lol.fandom.com/api.php";
    

    const params = {
      action: "cargoquery",
      format: "json",
      tables: "Players",
      fields: "ID, CurrentTeam, Role, Image",
      where: "Region='Korea' AND IsRetired=0",
      limit: 150
    };

    const response = await axios.get(url, { params });
    

    if (response.data.error) {
      console.error("API 에러 발생:", response.data.error.info);
      return;
    }

    const data = response.data.cargoquery;
    if (!data || data.length === 0) {
      console.log("가져온 데이터가 비어있습니다. 응답 전체:", JSON.stringify(response.data));
      return;
    }

    const players = data.map(item => item.title);
    console.log(`성공: ${players.length}명의 데이터를 가져왔습니다.`);

    for (const p of players) {
      if (!p.CurrentTeam) continue;

      const { error } = await supabase
        .from('players')
        .upsert({
          name: p.ID,
          position: p.Role,
          team_name: p.CurrentTeam,
          image_url: p.Image ? `https://lol.fandom.com/wiki/Special:FilePath/${p.Image.replace(/\s/g, '_')}` : null
        }, { onConflict: 'name' });
        
      if (error) console.error(`DB 저장 실패 (${p.ID}):`, error.message);
    }
    
    console.log("🎉 동기화 작업이 성공적으로 완료되었습니다!");
  } catch (err) {
    console.error("실행 중 오류:", err.message);
  }
}

syncRoster();
