import {darkStyles} from './dark-styles.js?v=2.0.0-alpha.9';
import {names,mod,parse} from './music.js?v=2.0.0-alpha.9';
import {parseBar,chordList,parseChart} from './solutions.js?v=2.0.0-alpha.9';
import {songs} from './song-pool.js?v=2.0.0-alpha.9';
import {worldStyles} from './world-styles.js?v=2.0.0-alpha.9';
import {worldMutation} from './world-generator.js?v=2.0.0-alpha.9';
export const styles={
Jazz:{description:'功能替代、次屬和弦、ii–V、三全音／backdoor，讓 3rd 與 7th 連接。',pattern:'jazz',voicing:'rootless',phrases:[['Cmaj9 Ebdim7','Dm9 G13','Em7 A7b9','Dm9 Db7#11'],['Em9 A7alt','Dm9 G13','Fm9 Bb13','C69 G7alt'],['C69','F#m7b5 B7b9','Em9 A7alt','Dm9 G13']],T:['Cmaj9','Em9 A7alt','C69 Ebdim7'],R:['Am9','Em7 A7alt','Dm9 G13'],S:['Fmaj9','Fm9 Bb13','Dm9 G13'],D:['G13','Dm9 Db7#11','G7sus4 G7alt']},
Gospel:{description:'斜線低音、減七經過和弦、IV–iv、sus 解決與 plagal 色彩。',pattern:'gospel',voicing:'open',phrases:[['C69 E7/G#','Am9 C7/G','Fmaj9 Fm6','C/G G7sus4'],['Cmaj9/E','Fmaj9 F#dim7','C/G A7b9','Dm9 G13'],['C69','Bb/C C7','Fmaj9 Fm6','C/G G7']],T:['C69/E','Cmaj9 E7/G#','C/G'],R:['Am9 C7/G','C7/G','Em7 A7b9'],S:['Fmaj9 Fm6','Fmaj9 F#dim7','Dm9/G'],D:['G7sus4 G13','C/G G7','Db9 C69']},
Fusion:{description:'Lydian #11、調式平移、非功能根音關係與旋律小調色彩。',pattern:'fusion',voicing:'open',phrases:[['Cmaj9#11','Ebmaj9#11','Dm11','Db7#11'],['Cmaj7#11','Abmaj9','Bb/C','Dmaj7#11'],['CmMaj9','F13','Dbmaj9#11','G7alt']],T:['Cmaj9#11','D/C','Ebmaj9#11'],R:['Am11','Abmaj9#11','AmMaj9'],S:['Fmaj7#11','Gbmaj9#11','Dm11'],D:['G7#11','Db7#11','Bb/C']},
'Bossa nova':{description:'6/9、m9、次屬和弦、半音減和弦；低音與切分和弦分開。',pattern:'bossa',voicing:'rootless',phrases:[['C69 A7b9','Dm9 G13','Em7 Ebdim7','Dm9 G7b9'],['Cmaj9','C#dim7','Dm9 G13','C69 G7b13'],['Am9 D9','Gmaj9 Cmaj9','F#m7b5 B7b9','Em9 E7b9']],T:['C69','Cmaj9 A7b9','Em7 Ebdim7'],R:['Am9 D9','Am6','Em7 A7b9'],S:['Fmaj9 Fm6','Dm9','Fmaj7 F#dim7'],D:['G13','Dm9 G7b9','G7sus4 G7b13']},
Rock:{description:'三和弦與 power chord、sus、Mixolydian ♭VII 和平行小調 ♭VI。',pattern:'rock',voicing:'open',phrases:[['C5','Bb','F','C G'],['C','G/B','Am','F Gsus4'],['Cm','Ab','Eb','Bb']],T:['C5','Csus2','C Bb'],R:['Am','Ab','Am G'],S:['F','F C/E','Ab F'],D:['G5','Gsus4 G','Bb F']},
'Japanese rock':{description:'王道 IV–V–iii–vi、iii 的屬化、下降低音與大／小調借用。',pattern:'jpop',voicing:'open',phrases:[['Fmaj7','G','Em7','Am7'],['Fadd9','G/F','Em7 E7/G#','Am G'],['Fmaj9','G13','C/E E7','Am7 A7']],T:['C/E','Em7 E7/G#','Cmaj9'],R:['Am7','Am G','Am A7'],S:['Fadd9','Fmaj7 Fm6','Dm7'],D:['G/F','G13','Gsus4 G']},
House:{description:'循環 m7／m9、平行和弦與離拍 stab；保留節拍上的空間。',pattern:'house',voicing:'close',phrases:[['Am9','Fmaj9','Cmaj9','G6'],['Cm9','Abmaj7','Fm9','Bb13'],['Cm7','Ebm7','Fm7','Bbm7']],T:['Cmaj9','Cm9','C69'],R:['Am9','Abmaj9','Am7'],S:['Fmaj9','Fm9','F6'],D:['G7sus4','Bb13','Gm9']},
Classical:{description:'三和弦轉位、級進低音、次屬和弦與終止式；此模式非嚴格四部和聲。',pattern:'alberti',voicing:'close',phrases:[['C','G/B','Am','Em/G'],['F','C/E','Dm/F','G7'],['C/E','F','Dm/F G7','C']],T:['C/E','C G/B','C'],R:['Am/C','E7/G# Am','Am Em/G'],S:['F/A','Dm/F','F C/E'],D:['G/B','Dm/F G7','C/G G7']},
'Phrygian dominant':{description:'1 ♭2 3 4 5 ♭6 ♭7；主大三和弦、♭II 與小 iv。具體調式，非泛稱民族音樂。',pattern:'ostinato',voicing:'open',phrases:[['C','Db','Fm','C'],['C Db/C','C','Bbm','C'],['C7b9','Dbmaj7','Fm/C','C']],T:['C','C7b9','Db/C'],R:['Ab','Bbm','Ab/C'],S:['Fm','Db','Fm/C'],D:['Db/C','Bbm C','C7b9']},
'Dorian folk':{description:'小調主音配大六度；i–IV 的 Dorian 色彩、持續低音與開放弦感。',pattern:'folk',voicing:'open',phrases:[['Cm','F','Bb','Cm'],['Cm9','F/C','Dm7','Cm6'],['Cm','Bb/C','F','Cm']],T:['Cm','Cm6','Cm9'],R:['Am7b5','Cm/A','Cm6'],S:['F','F/C','Dm7'],D:['Gm7','Bb','F/C']}
};
const transpose=(symbol,key)=>{const c=parse(symbol);if(!c)throw Error('Invalid style chord '+symbol);return names[mod(c.root+key)]+c.q+(symbol.includes('/')&&!symbol.includes('6/9')?'/'+names[mod(c.bass+key)]:'');};
function preset(description,pattern,voicing,phrases){return {description,pattern,voicing,phrases};}
Object.assign(styles,{
'Soul':preset('大六／九和弦、IV–iv 與柔和次屬；有呼吸的切分和聲。','soul','open',[['Fmaj9','Fm6','C/E','A7 Dm7'],['C69','Em7 A7','Dm9','G13'],['Am9','D9','Fmaj9','C69']]),
'R&B':preset('小九和弦、major 9、半音低音與 secondary dominant，慵懶的分層節奏。','rnb','rootless',[['Dm9','G13','Cmaj9','A7b9'],['Fmaj9','Em7 A7b9','Dm9','G7sus4'],['Am9','Gm9 C13','Fmaj9','E7#9']]),
'Funk':preset('Dominant 9/13、Dorian vamp，十六分休止與短促和弦互相咬合。','funk','rootless',[['C9','C9','F9','G9'],['Dm9','G13','Dm9','G9'],['Cm9','F13','Bb9','G7#9']]),
'EDM':preset('可循環的 vi–IV–I–V、add9 與 sus；八分節奏與八度低音推進。','edm','open',[['Am','Fadd9','C','Gsus4 G'],['F','G','Am','Am'],['C','G','Am','F']]),
'Lo-fi hip-hop':preset('暖色 maj7/m9、細碎小調 ii–V、短句留白與鬆動的後拍。','lofi','close',[['Dm9','G13','Cmaj9','A7b9'],['Fmaj9','Fm9','Em9','A7b9'],['Am9','D9','Gmaj9','Cmaj9']]),
'Chill':preset('慢速 add9/6/9、共同音延留與稀疏旋律；給聲部空間自然呼吸。','chill','open',[['Fmaj9','Cmaj9/E','Dm9','C69'],['Am9','Fmaj9','Cmaj9','G6'],['Cmaj9','D/C','Fmaj9/C','Cmaj9']]),
'Neo-soul':preset('半音接近、m11/maj9、backdoor 與平滑內聲部；不急著回到 I。','neosoul','rootless',[['Fm9','Bb13','Cmaj9','A7alt'],['Dm11','Db7#11','Cmaj9','B7alt'],['Fmaj9','Em9 A7alt','Dm11','G13']]),
'American pop':preset('I–V–vi–IV / vi–IV–I–V，加入 sus、轉位與偶爾 iv 借用。','pop','open',[['C','G/B','Am','Fadd9'],['Am','F','C','G'],['F','C','Dm7','G'],['C','Em','F','Fm']]),
'Mandopop':preset('級進低音、IV–iv、平行大小調與副歌前的次屬和弦。','ballad','open',[['Fmaj7','G','Em7 E7','Am7'],['C','G/B','Am C/G','F Fm'],['Dm7','G','Cmaj7','A7']]),
'K-pop':preset('R&B 的七九和弦、轉位與大小調借用，搭配切分的 pop groove。','rnb','open',[['Fmaj9','G13','Em7','Am9'],['Cmaj9/E','Fm9','Dm9','G13'],['Am9','D9','Gmaj9','Cmaj9']]),
'Major blues':preset('12 小節大調藍調：I7–IV7–V7、quick change 與 ii–V turnaround。選 12 bars 可聽完整曲式。','blues','close',[['C7','F7','C7','C7','F7','F7','C7','A7','Dm7','G7','C7 A7','Dm7 G7'],['C9','F9','C9','Gm7 C7','F9','F#dim7','C/G','A7b9','Dm9','G13','C9 A7','Dm9 G13'],['C7','F7','C7','C7','F7','Fm6','C/G','A7','Dm7','G7','C7','G7']]),
'Minor blues':preset('12 小節小調藍調：i–iv、♭VI–V 或 iiø–V–i；小調 ii–V 的解決。','blues','close',[['Cm7','Cm7','Cm7','Cm7','Fm7','Fm7','Cm7','Cm7','Ab7','G7b9','Cm6','Dm7b5 G7b9'],['Cm9','Fm9','Cm9','Cm9','Fm9','Fm9','Cm9','A7alt','Dm7b5','G7b9','Cm6','G7b9'],['Cm6','Cm6','Cm6','C7b9','Fm6','Fm6','Cm/G','Ab7','Dm7b5','G7b9','Cm6','Dm7b5 G7b9']]),
'Neoclassical rock':preset('古典戲劇搖滾：和聲小調、半音下降低音、踏板低音、次屬和弦與鋼琴 ostinato。','neoclassical','open',[['Cm','Cm/B','Cm/Bb','F/A','Ab','Eb/G','Dm7b5','G7b9'],['Cm','Ab','Fm','G7b9'],['Cm','G/B','Bb','F/A','Ab','Eb/G','Fm','G7']]),
'Nu-disco':preset('流動的七九和弦、Dorian／Mixolydian 與八度低音；輕盈切分。','disco','close',[['Dm9','G13','Cmaj9','A7'],['Am9','D9','Am9','G13'],['Fmaj9','Em7','Dm9','G13']]),
'Ambient':preset('長音、開放配置、共同音與緩慢調式變化。','ambient','open',[['Cmaj9','Fmaj9/C','D/C','Cmaj9'],['Am11','Fmaj9','Cmaj9','Gsus2'],['Fmaj9','G6','Am9','Cmaj9']])
});
styles.House=preset('Deep / Soulful House · 共同音九和弦、跨拍延留、稀疏切分與獨立低音。建議 114–124 BPM。','house','rootless',[['Am9','D9','Gmaj9','Cmaj9'],['Cm9','Fm9','Abmaj9','Gm9'],['Dm9','G13','Cmaj9','Fmaj9'],['Fm9','Abmaj9','Cm9','Bb13']]);
Object.assign(styles,darkStyles,worldStyles);
export const styleLabels={...Object.fromEntries(Object.entries(darkStyles).map(([k,v])=>[k,v.label])),...Object.fromEntries(Object.entries(worldStyles).map(([k,v])=>[k,v.label])),'Neoclassical rock':'古典戲劇搖滾 · Neoclassical rock',House:'Deep / Soulful House','Major blues':'Major blues · 大調藍調','Minor blues':'Minor blues · 小調藍調'};
export function seeded(seed){let n=(seed+971)>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function tint(symbol,style,level,random,key=0,mode='major'){const c=parse(symbol);if(!c)return symbol;
if(styles[style]?.dark){
 // Preserve composed modal/chromatic colors; strip soft jazz extensions from user seeds.
 let q=c.q;if(styles[style].heavy&&!q.includes('dim'))q='5';
 else if(!['5','sus2','sus4','dim','dim7','m7b5','7b9','add9','madd9'].includes(q)){q=c.minor?'m':c.intervals.includes(10)?'7':'';if(mode==='minor'&&mod(c.root-key)===0&&q==='')q='m';}
 const base=c.rootName+q;return base+(symbol.includes('/')?'/'+names[c.bass]:'');
}const simple=['Rock','Japanese rock','Classical','American pop','Mandopop','EDM','Neoclassical rock'].includes(style);if(c.symbol.includes('/')&&!c.pcs.includes(c.bass)||/[b#]/.test(c.q)||c.q==='m6'||c.q.includes('dim')||c.q.includes('m7b5')||c.q.includes('sus')||c.q==='5'||c.q.includes('alt')||c.q.includes('Maj'))return symbol;const tonal=!['House','Fusion','Chill','Ambient','Dorian folk','Phrygian dominant'].includes(style);const isDom=c.intervals.includes(10)||(tonal&&mod(c.root-key)===7&&['','6','add9'].includes(c.q));let options=c.minor?(simple?['m','m7','madd9']:['m7','m9','m11']):isDom?(simple?['7','9']:['7','9','13']):(simple?['','add9','6']:['maj7','maj9','69']);if(level==='low')options=options.slice(0,2);if(level==='high'&&!simple)options=c.minor?['m9','m11','m13']:isDom?['9','13','7#11','7b13']:['maj9','maj7#11','maj13'];if(style==='Fusion'&&!c.minor&&!c.intervals.includes(10))options=['maj7#11','maj9#11'];if(style==='Neoclassical rock')options=c.minor?['m','madd9','m']:isDom?['','7','7b9']:['','add9'];const q=options[Math.floor(random()*options.length)];return c.rootName+q+(symbol.includes('/')?'/'+names[c.bass]:'');}
function minorize(symbol,key){const c=parse(symbol),d=mod(c.root-key);if(c.intervals.includes(10)&&!c.minor&&d!==7)return symbol;const mapped={0:[0,'m9'],2:[2,'m7b5'],4:[3,'maj9'],5:[5,'m9'],7:[7,'7b9'],9:[8,'maj9'],11:[10,'7']};if(!mapped[d])return symbol;const [root,q]=mapped[d];return names[mod(key+root)]+q;}
function inversion(symbol,random){const c=parse(symbol);if(!c||symbol.includes('/')||c.q.includes('dim')||c.q==='5')return symbol;const structural=c.intervals.filter(n=>[0,3,4,7].includes(n));const bass=structural[Math.floor(random()*structural.length)];return c.rootName+c.q+(bass?'/'+names[mod(c.root+bass)]:'');}
export function cadenceTo(target,{tritone=false,rich=false}={}){const c=parse(target);if(!c||c.intervals.includes(6)||c.intervals.includes(8)||!c.intervals.some(n=>n===3||n===4))return null;return [names[mod(c.root+2)]+(c.minor?'m7b5':rich?'m9':'m7'),names[mod(c.root+(tritone?1:7))]+(tritone?(rich?'7#11':'7'):c.minor?'7b9':rich?'13':'7')];}
export function mutate(source,{style='Jazz',key=0,mode='major',freedom='free',density=2,seed=0,randomness='medium',method='style',loop=true}={}){
if(method==='original')return structuredClone(source);
const cfg=styles[style]||styles.Jazz,random=seeded(seed),count=source.length||4,filled=source.some(b=>chordList(b).length),level=randomness;
const songCandidates=songs.filter(s=>s.style===style&&s.mode===mode);const phrases=[...cfg.phrases,...(cfg.dark?cfg.contrasts.map(([,chart])=>chart.split('|')):[]),...songCandidates.map(s=>parseChart(s.chart).map(b=>b.chords.map(c=>c.symbol).join(' ')))];const phrase=phrases[((seed%phrases.length)+phrases.length)%phrases.length];
const replace=method==='style'&&freedom==='free'&&(level==='high'||level==='medium'&&seed%2===0);
let result=cfg.world?worldMutation(source,cfg,{key,seed,randomness,freedom,density,method}):Array.from({length:count},(_,i)=>{const input=chordList(source[i]||{});let cs;
if(!filled||replace||!input.length){cs=parseBar(phrase[i%phrase.length]).map(c=>({...c,symbol:transpose(c.symbol,key)}));if(mode==='minor'&&!cfg.dark&&!['Minor blues','Major blues','Neoclassical rock','Dorian folk','Phrygian dominant'].includes(style))cs=cs.map(c=>({...c,symbol:minorize(c.symbol,key)}));}
else cs=structuredClone(input);
if(!(cfg.dark&&(!filled||replace||!input.length)))cs=cs.map(c=>({...c,symbol:tint(c.symbol,style,level,random,key,mode)}));
if(!cfg.dark&&method==='style'&&random()<(level==='low'?.12:.35)&&!['Major blues','Minor blues'].includes(style))cs[0].symbol=inversion(cs[0].symbol,random);
if(density===1)cs=[{...cs[0],beats:4}];
return {chords:cs,reason:style+' · '+(replace?'句型重構':filled?'聲部色彩':'風格句型')};});
// A lead-in is derived from its actual next target, never an unrelated random diminished chord.
for(let i=0;i<count;i++){if(i===count-1&&!loop)continue;const target=result[(i+1)%count].chords[0]?.symbol,cs=result[i].chords;const useSub=method==='tritone'||method==='style'&&level==='high'&&random()<.25;const a=cadenceTo(target,{tritone:useSub,rich:level!=='low'&&random()<.6});if(!a)continue;
const requested=['cadence','tritone'].includes(method),jazzy=['Jazz','Gospel','Bossa nova','R&B','Neo-soul','Lo-fi hip-hop'].includes(style);
const insert=requested||(method==='style'&&density===3&&jazzy&&random()<.65);
if(insert&&density!==1){const offset=(seed+i)%3;if(density===3||requested&&offset!==0)result[i]={chords:[{symbol:cs[0].symbol,beats:2},{symbol:a[0],beats:1},{symbol:a[1],beats:1}],reason:(useSub?'ii–subV':'ii–V')+' → '+target};else result[i]={chords:[{symbol:cs[0].symbol,beats:3},{symbol:a[1],beats:1}],reason:'屬和弦接近 → '+target};}
else if(requested&&density===1&&i%2===1)result[i]={chords:[{symbol:a[1],beats:4}],reason:'屬和弦 → '+target};
}
return result;}
export const library=[
{id:'autumn',title:'Ex1',key:10,mode:'major',style:'Jazz',chart:'| Cm7 | F7 | Bbmaj7 | Ebmaj7 | Am7b5 | D7b9 | Gm6 | Gm6 |'},
{id:'rhythm',title:'Ex2',key:10,mode:'major',style:'Jazz',chart:'| Bb6 G7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Fm7 Bb7 | Ebmaj7 Edim7 | Bb/F G7 | Cm7 F7 |'},
{id:'blues',title:'Ex3',key:5,mode:'major',style:'Jazz',chart:'| F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | D7b9 | Gm7 | C7 | F7 D7 | Gm7 C7 |'},
{id:'canon',title:'Ex4',key:2,mode:'major',style:'Classical',chart:'| D | A/C# | Bm | F#m/A | G | D/F# | G | A |'},
{id:'royal',title:'Ex5',key:0,mode:'major',style:'Japanese rock',chart:'| Fmaj7 | G | Em7 | Am7 |'},
{id:'bossa',title:'Ex6',key:0,mode:'major',style:'Bossa nova',chart:'| C69 A7b9 | Dm9 G13 | Em7 Ebdim7 | Dm9 G7b9 |'},
{id:'house',title:'Ex7',key:0,mode:'minor',style:'House',chart:'| Cm9 | Abmaj9 | Fm9 | Bb13 |'}
];
