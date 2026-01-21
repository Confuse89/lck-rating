async function updateRecentStats() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  
  const response = await axios.get('https://api.pandascore.co/lol/matches', {
    params: {
      'filter[league_id]': 293,
      'filter[status]': 'finished',
      'range[begin_at]': `${threeHoursAgo},${new Date().toISOString()}`
    },
    headers: { 'Authorization': `Bearer ${PSK.trim()}` }
  });

  if (response.data.length === 0) {
    console.log("🆕 최근 종료된 새로운 경기가 없습니다.");
    return;
  }

}
