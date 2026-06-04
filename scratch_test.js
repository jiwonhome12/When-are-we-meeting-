async function run() {
  const res = await fetch('https://place-api.map.kakao.com/places/panel3/18577297', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://place.map.kakao.com/',
      'appVersion': '6.6.0',
      'pf': 'PC'
    }
  });
  const json = await res.json();
  console.log("Summary keys:", Object.keys(json.summary || {}));
  console.log("Summary details:", {
    star_rating: json.summary?.star_rating,
    review_count: json.summary?.review_count,
    scoresum: json.summary?.scoresum,
    scorecnt: json.summary?.scorecnt,
    feedback: json.summary?.feedback,
    point: json.summary?.point
  });
  console.log("Full summary object:", JSON.stringify(json.summary, null, 2));
}
run();
