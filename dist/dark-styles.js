// Original 4/4 studies using documented rock/modal and minor-key harmonic devices.
// Requiem is a harmonic/chorale study, not a transcription or a claim of liturgical form.
const make=(label,description,pattern,tempo,phrases,moods,contrasts,heavy=false)=>({label,description,pattern,tempo,phrases,moods,contrasts,heavy,dark:true,defaultMode:'minor',voicing:heavy?'close':'open',group:'黑暗／重型與另類',moodOrder:['aggressive','bleak','eerie','ritual']});
export const darkStyles={
 'Heavy Metal':make('Heavy Metal · 重金屬','Power chord、♭II 半音逼近、♭VI–♭VII 與三全音根音張力；低音 gallop 推進。','metal',144,
 [['C5','Ab5','Bb5','C5'],['C5 Db5','C5 Bb5','Ab5 Gb5','G5 C5'],['C5','Eb5','F5 Db5','G5'],['C5 Bb5','Ab5 G5','F5 Eb5','Db5 C5']],
 ['猛烈・鋼鐵','陰鬱・深坑','詭異・裂縫','莊嚴・戰鼓'],
 [['猛烈・鐵門','C5:2 Db5:1 C5:1|Eb5 F5|Gb5 G5|Bb5 C5'],['陰鬱・煤灰','C5|Ab5|F5|G5 Db5'],['詭異・鏽刀','C5|Gb5|Db5|G5'],['莊嚴・火炬','F5|Ab5 Bb5|C5|G5 C5']],true),
 'Doom Metal':make('Doom / Sludge · 厄運金屬','慢速低音、長音重擊、半音摩擦與三全音；保留稀疏空間和沉重的回返。','doom',64,
 [['C5','Gb5','F5','C5'],['Cm','Db','Fm','G7'],['C5','Bb5','Ab5','Gb5 G5'],['Cm','Ab/C','Fm/C','G7b9']],
 ['猛烈・巨石','陰鬱・泥沼','詭異・空井','莊嚴・石棺'],
 [['猛烈・斷牆','C5|Db5|C5|Gb5 F5'],['陰鬱・礦坑','Cm|Cm/Bb|Ab|G7'],['詭異・黑霧','C5|Gb5/C|Db/C|C5'],['莊嚴・銅鐘','Fm|Db/F|G7|Cm']]),
 Grunge:make('Grunge · 油漬搖滾','Power / sus、平行移動與大／小調混用；重擊與留白交替，不自動加上柔和九和弦。','grunge',102,
 [['C5','Eb5','F5','Ab5'],['Csus4','Bbsus4','Absus4','Gsus4'],['C','Eb','Bb','F'],['Cm','Ab','E','G']],
 ['猛烈・車庫','陰鬱・雨衣','詭異・舊電視','莊嚴・灰天'],
 [['猛烈・破音','C5 F5|Eb5 Ab5|C5 Bb5|Gb5 F5'],['陰鬱・地下室','Cm|Eb/Bb|Ab|Fm'],['詭異・斜牆','Csus2|Ebsus2|Bsus2|Dsus2'],['莊嚴・舊橋','Ab|Eb/G|Fm|Csus4 C']]),
 Alternative:make('Alternative · 另類搖滾','三度關係、非調內大三和弦、IV–iv 借用與共同音；保留不安的開放和弦與反覆音型。','alternative',112,
 [['C','E','F','Fm'],['Cm','E','Ab','G'],['Csus2','Abmaj7','Fm','Dsus2'],['C','Gm','Db','Fm']],
 ['猛烈・裂牆','陰鬱・樓梯','詭異・失焦','莊嚴・空城'],
 [['猛烈・警報','C5|Eb|B5|F5'],['陰鬱・走廊','Cm|Cm/B|Ab|Fm'],['詭異・白房','Cadd9|Ebadd9|F#add9|Abadd9'],['莊嚴・高樓','Fm|Ab|C|E']]),
 Gothic:make('Gothic / Darkwave · 哥德暗潮','自然／和聲小調、i–iv、♭VI 與 V，踏板低音配冷峻的八分反覆；有陰影感的旋律線。','gothic',116,
 [['Cm','Ab','Fm','G7'],['Fm','Cm/Eb','Db','G7'],['Cm','Bb','Ab','G'],['Cm','Cm/B','Cm/Bb','Ab G7']],
 ['猛烈・黑旗','陰鬱・長廊','詭異・鏡面','莊嚴・尖塔'],
 [['猛烈・夜車','Cm|Db|Ab|G7'],['陰鬱・墓園','Fm|Ab/Eb|Dm7b5|G7'],['詭異・冷燈','Cmadd9|Ab/C|Fm/C|G7/C'],['莊嚴・黑殿','Ab|Fm|Cm/G G7|Cm']]),
 Requiem:make('Requiem · 安魂曲色彩','小調合唱式長音、下降低音、減七與 ♭II6→V→i；4/4 原創和聲練習，保留莊嚴與悼念感。','requiem',62,
 [['Cm','Fm/Ab','Db/F','G7'],['Cm','Cm/B','Cm/Bb','F/A'],['Fm','Bdim7','Cm/G G7','Cm'],['Ab','Fm','Dm7b5 G7b9','Cm']],
 ['猛烈・審判','陰鬱・燭台','詭異・迴廊','莊嚴・祭壇'],
 [['猛烈・雷鳴','Cm G7/B|Cm/Eb Fm|Db/F|G7b9 Cm'],['陰鬱・長椅','Cm|G/B|Cm/Bb|Fm/Ab G7'],['詭異・空殿','Cm|Bdim7|Fm/Ab|G7b9'],['莊嚴・安息','Fm/Ab|Db/F|Cm/G G7|Cm']])
};
darkStyles.Grunge.phraseModes=['minor','minor','major','minor'];
darkStyles.Alternative.phraseModes=['major','minor','minor','minor'];
darkStyles.Alternative.contrastModes=['minor','minor','major','major'];
export const darkStudyMoods=Object.fromEntries(Object.entries(darkStyles).map(([id,s])=>[id,s.moods]));
export const darkContrasts=Object.fromEntries(Object.entries(darkStyles).map(([style,s])=>[style,s.contrasts.map(([mood,chart],i)=>({id:`dark-${style}-${i}`,style,type:'study',key:0,mode:s.contrastModes?.[i]||'minor',category:s.moodOrder[i],mood,chart:'| '+chart.split('|').join(' | ')+' |',feel:{gate:s.pattern==='metal'?72:s.pattern==='requiem'||s.pattern==='doom'?98:82,human:20},open:!s.heavy}))]));
