const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const PSK = process.env.PSK;

async function syncLckStats() {
  console.log("--- [상세 지표(KDA/CS/시야/딜량) 수집 시작] ---");

  try {
    const response = await axios.get('https://api.pandascore.co/lol/matches', {
      params: {
        'filter[league_id]': 293,
        'filter[status]': 'finished',
        'range[begin_at]': '2026-01-01T00:00:00Z,2026-12-31T23:59:59Z',
        'per_page': 100,
        'sort': '-begin_at'
      },
      headers: { 'Authorization': `Bearer ${PSK.trim()}` }
        'Accept': 'application/json'
    });

    const matches = response.data;
    console.log(`🔎 분석할 총 매치 수: ${matches.length}개`);

    if (matches.length === 0) {
      console.log("⚠️ 2026년 경기 데이터가 아직 없습니다. 날짜 범위를 확인해 주세요.");
      return;
    }

    const playerStats = {};

    for (const match of matches) {
      console.log(`📊 [${match.begin_at.split('T')[0]}] ${match.name} 분석 중...`);
      
      for (const game of match.games) {
        const gameDetail = await axios.get(`https://api.pandascore.co/lol/games/${game.id}`, {
          headers: { 'Authorization': `Bearer ${PSK.trim()}` }
        });

        const gameLengthMinutes = (gameDetail.data.length || 0) / 60;

        if (gameDetail.data.players) {
          gameDetail.data.players.forEach(p => {
            const name = p.player.name;
            if (!playerStats[name]) {
              playerStats[name] = { 
                wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0,
                total_cs: 0, total_vision: 0, total_damage: 0, 
                total_game_minutes: 0, game_count: 0 
              };
            }

            const stats = p.stats;
            const isWin = p.opponent.id === gameDetail.data.winner.id;
            
            playerStats[name].game_count += 1;
            if (isWin) playerStats[name].wins += 1;
            else playerStats[name].losses += 1;

            playerStats[name].kills += (stats.kills || 0);
            playerStats[name].deaths += (stats.deaths || 0);
            playerStats[name].assists += (stats.assists || 0);
            
            playerStats[name].total_cs += (stats.minions_killed || 0) + (stats.neutral_minions_killed || 0);
            playerStats[name].total_vision += (stats.vision_score || 0);
            playerStats[name].total_damage += (stats.total_damage_to_champions || 0);
            playerStats[name].total_game_minutes += gameLengthMinutes;
          });
        }
      }
    }

    console.log("\n💾 계산된 지표를 Supabase에 반영 중...");
    for (const [name, s] of Object.entries(playerStats)) {
      const kda = s.deaths === 0 ? (s.kills + s.assists).toFixed(2) : ((s.kills + s.assists) / s.deaths).toFixed(2);
      const dpm = s.total_game_minutes > 0 ? (s.total_damage / s.total_game_minutes).toFixed(0) : 0;
      const cspm = s.total_game_minutes > 0 ? (s.total_cs / s.total_game_minutes).toFixed(1) : 0;
      const avgVision = s.game_count > 0 ? (s.total_vision / s.game_count).toFixed(1) : 0;

      const { error } = await supabase
        .from('players')
        .update({
          wins: s.wins,
          losses: s.losses,
          kills: s.kills,
          deaths: s.deaths,
          assists: s.assists,
          kda: parseFloat(kda),
          total_cs: s.total_cs,
          avg_cs_per_min: parseFloat(cspm),
          total_vision_score: s.total_vision,
          avg_vision_score: parseFloat(avgVision),
          total_damage: s.total_damage,
          avg_dpm: parseFloat(dpm),
          last_updated: new Date()
        })
        .eq('name', name); 

      if (error) {
        console.error(`❌ [${name}] 업데이트 실패:`, error.message);
      } else {
        console.log(`✅ [${name}] 업데이트 완료: DPM ${dpm} / KDA ${kda}`);
      }
    }

    console.log("\n🎉 전적 동기화 완료!");

  } catch (err) {
    console.error("❌ 오류 발생:", err.response?.data || err.message);
  }
}

syncLckStats();
