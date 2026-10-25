// Original accompaniment studies. Pitch collections are not complete traditions.
const scale=(label,intervals,degrees,note)=>({label,intervals,degrees,note});
export const worldScales={
 hijaz:scale('Hijaz · 12-TET',[0,1,4,5,7,8,10],[0,1,2,3,4,5,6],'Hijaz 音程色彩的十二平均律近似；完整 dromos／maqam 還包含旋律走向與音準。'),
 hirajoshi:scale('Hirajoshi',[0,2,3,7,8],[0,1,2,4,5],'平調子相關五聲音列；以留白與少音配置呈現。'),
 insen:scale('In-sen',[0,1,5,7,10],[0,1,3,4,6],'含半音的日本五聲音列；避免自動補滿西式三和弦。'),
 tizita:scale('Tizita major · 12-TET',[0,2,4,7,9],[0,1,2,4,5],'Tizita 大調型的五聲近似；qenet 的演奏音準與句法另有細節。'),
 native:scale('Contemporary flute minor pentatonic',[0,3,5,7,10],[0,2,3,4,6],'當代 Native American flute 常見的小五聲練習；各族群與樂器並無統一音階。'),
 bhupali:scale('Bhupali · pitch study',[0,2,4,7,9],[0,1,2,4,5],'Sa Re Ga Pa Dha；以 Sa／Pa 持續音支撐。這是音列與伴奏練習，非完整 raga。'),
 yaman:scale('Yaman · pitch study',[0,2,4,6,7,9,11],[0,1,2,3,4,5,6],'升四度 tivra Ma；持續主音與五度，不自動加入功能終止式。'),
 phrygian:scale('Phrygian',[0,1,3,5,7,8,10],[0,1,2,3,4,5,6],'Flamenco 常見小三度旋律色彩；主和弦轉大三度時需配合調整。'),
 major:scale('Ionian',[0,2,4,5,7,9,11],[0,1,2,3,4,5,6],'大調和聲音列；實際旋律可依和弦與語彙增減。'),
 majorPent:scale('Major pentatonic',[0,2,4,7,9],[0,1,2,4,5],'大五聲旋律選擇；不代表整個文化只使用此音階。'),
 minor:scale('Aeolian',[0,2,3,5,7,8,10],[0,1,2,3,4,5,6],'自然小調，可用於現代舞曲循環。'),
 dorian:scale('Dorian',[0,2,3,5,7,9,10],[0,1,2,3,4,5,6],'小三度、大六度；i–IV 與持續低音的調式色彩。'),
 mixolydian:scale('Mixolydian',[0,2,4,5,7,9,10],[0,1,2,3,4,5,6],'大三度與小七度；適合開放弦與屬七色彩。')
};
const study=(label,description,scaleIds,pattern,tempo,phrases,{group='地域調式與器樂靈感',pedal=false,strict=true}={})=>({label,description,scaleIds,pattern,tempo,phrases,group,pedal,strict,world:true,voicing:'open'});
export const worldStyles={
 'Greek Hijaz':study('希臘 · Hijaz','希臘 dromos Hijaz：主大三和弦、小 iv、♭II；4/4 伴奏練習，不代替傳統舞曲拍號。',['hijaz'],'modalPluck',100,[['C','Db','Fm','C'],['Fm','Db/C','C','Bbm C'],['C5','Bbm','Fm/C','C']]),
 'Japanese Hirajoshi':study('日本 · Hirajoshi','平調子五聲、空五度、少音分解與留白；原創現代伴奏。',['hirajoshi'],'sparsePluck',76,[['Cmadd9','Abmaj7/C','C5','Cm'],['Abmaj7','Cmadd9/G','G5','Cm'],['Cm','G5','Abmaj7/C','C5']]),
 'Japanese In-sen':study('日本 · In-sen','1 ♭2 4 5 ♭7；sus、開放五度與半音張力，保留稀疏旋律空間。',['insen'],'sparsePluck',72,[['Csus4','Bbsus2/C','C5','Csus4'],['Fsus4/C','Csus4','Db(no5)','C5'],['C5','Db(no5)/C','Bbsus2','Csus4']]),
 'Ghana Highlife':study('迦納 · Highlife','I–IV–V 與交錯吉他分解、切分重音。此處為鋼琴／MIDI 的高生命樂編曲練習。',['major','majorPent'],'highlife',108,[['C','F','C G','C'],['F','C/E','G7','C6'],['C G','F C','Dm G7','C']],{strict:true}),
 'Ethiopian Tizita':study('衣索比亞 · Tizita','Tizita 大調型五聲與短句應答；十二平均律的原創伴奏，不將 qenet 簡化成整套文化。',['tizita'],'pentatonicAnswer',82,[['C69','Am7','Em7(no5)','C6'],['Am7','Cadd9','Em7(no5)','C69'],['C5','Am7/C','C69','Em7(no5)/C']]),
 'Hawaiian Slack-key':study('夏威夷 · Slack-key 靈感','交替低音、上聲部連奏與 I–IV–V。演奏為鋼琴近似；吉他圖維持標準 EADGBE，未模擬開放調弦。',['major','majorPent','mixolydian'],'slackKey',88,[['C','F','C G7','C6'],['F','C/E','D7 G7','C'],['C6','Am','Dm7 G7','C']],{strict:false}),
 'Native Flute':study('北美原住民笛 · 當代五聲練習','當代 Native American flute 的小五聲創作靈感，以持續音與留白伴奏；不重現族群或儀式曲目。',['native'],'breathingDrone',68,[['C5','Cm7/C','Fsus4/C','C5'],['Cm7','Fsus4/C','Bbsus2/C','C5'],['C5','Bbsus2/C','Cm7','C5']],{pedal:true}),
 'Indian Bhupali':study('印度 · Bhupali 音列','Sa Re Ga Pa Dha：主音／五度持續音與五聲分解，避免自動爵士終止；為 raga 音列練習。',['bhupali'],'ragaDrone',72,[['C5','C69','Am7/C','C5'],['Cadd9','C5','Em7(no5)/C','C69'],['C5','Am7/C','Cadd9','C5']],{pedal:true}),
 'Indian Yaman':study('印度 · Yaman 音列','Tivra Ma 升四度、Sa／Pa 持續音、長線分解。十二平均律音列練習，未實作 meend 或 tala。',['yaman'],'ragaDrone',76,[['C5','Cmaj7#11','D/C','Cmaj9'],['Cmaj9#11','C5','Bm7/C','Cmaj7'],['D/C','Cmaj7','C5','Cmaj9#11']],{pedal:true}),
 'Afrobeats':study('Afrobeats · 西非流行','短和聲循環、切分上聲部與獨立低音；受西非流行編曲啟發，與 Fela 式 Afrobeat 分開。',['major','majorPent'],'afrobeats',104,[['Cadd9','G','Am7','F6'],['F6','G','Em7','Am7'],['Am7','F','C6','G']],{group:'跨文化流行與舞曲'}),
 'Amapiano':study('Amapiano · 南非','七九和弦、留白與低音回應，約 110 BPM；MIDI 輸出音高節奏，log-drum 音色需由 DAW 指定。',['minor'],'amapiano',112,[['Cm9','Abmaj9','Fm9','Gm7'],['Fm9','Gm7','Cm9','Bb6'],['Cm9','Ebmaj9','Abmaj9','Bb9sus4']],{group:'跨文化流行與舞曲',strict:false}),
 'Reggaeton':study('Reggaeton · 拉丁／加勒比','小調流行循環搭配 dembow 啟發的和弦落點；此處提供和聲 MIDI，沒有鼓組。',['minor'],'dembow',94,[['Cm','Ab','Eb','Bb'],['Cm','Bb','Ab','Bb'],['Ab','Bb','Cm','Cm']],{group:'跨文化流行與舞曲'}),
 'Dancehall':study('Dancehall · 牙買加','短 vamp、離拍和弦與低音應答；用鋼琴呈現 riddim 的和聲空間。',['minor','dorian'],'dancehall',98,[['Cm','Bb','Cm','Bb'],['Cm7','Fm7','Cm7','Gm7'],['Ab','Bb','Cm','Cm']],{group:'跨文化流行與舞曲'}),
 'Latin Pop':study('Latin pop · 拉丁流行','小調循環、次屬與 3–3–2 切分鋼琴；現代跨文化編曲方向。',['minor'],'latinPop',102,[['Cm','Ab','Eb','Bb'],['Fm','Bb','Eb','G7'],['Cm','Fm','Ab','G7']],{group:'跨文化流行與舞曲',strict:false}),
 'Flamenco':study('西班牙 · Flamenco 色彩','iv–♭III–♭II–I 的安達魯西亞終止，主和弦大三度；4/4 tangos／pop 靈感，非完整 compás。',['hijaz','phrygian'],'flamenco',108,[['Fm','Eb','Db','C'],['Db','C','Fm','C'],['C','Db','Bbm','C']],{group:'跨文化流行與舞曲',strict:false}),
 'Arabic Hijaz':study('阿拉伯 · Hijaz 色彩','Hijaz 下方四音列的增二度與主音踏板；十二平均律融合伴奏，非完整 maqam 演奏。',['hijaz'],'modalPluck',92,[['C5','Db/C','Fm/C','C'],['C','Bbm/C','Db/C','C5'],['Fm/C','C','Db/C','C']],{pedal:true}),
 'Celtic Dorian':study('愛爾蘭／凱爾特 · Dorian','Dorian i–IV、♭VII 與開放五度；4/4 folk 伴奏練習，未模擬 jig 的 6/8。',['dorian'],'folk',100,[['Cm','F','Bb','Cm'],['C5','Bb','F/C','Cm'],['F','Cm','Gm','Cm']],{strict:true})
};
