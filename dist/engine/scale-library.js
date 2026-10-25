import {parse,mod,names} from './music.js?v=12';
import {worldStyles,worldScales} from './world-styles.js?v=12';
const catalog=[
['Ionian',[0,2,4,5,7,9,11],'大調；4 度長音注意與 3 度摩擦。'],['Lydian',[0,2,4,6,7,9,11],'#11 明亮懸浮，適合 maj7 色彩。'],['Major pentatonic',[0,2,4,7,9],'少音階音，留出旋律空間。'],['Major bebop',[0,2,4,5,7,8,9,11],'含半音經過音；不要把每個音都當停留音。'],['Dorian',[0,2,3,5,7,9,10],'小調帶大六度，常用於 minor vamp。'],['Aeolian',[0,2,3,5,7,8,10],'自然小調；♭6 比 Dorian 更暗。'],['Phrygian',[0,1,3,5,7,8,10],'♭2 強烈張力，需調式上下文。'],['Melodic minor',[0,2,3,5,7,9,11],'爵士上行旋律小調，適合 mMaj7 / m6。'],['Harmonic minor',[0,2,3,5,7,8,11],'小調大七度與 ♭6 色彩。'],['Minor pentatonic',[0,3,5,7,10],'五聲語彙；適合 minor / blues。'],['Minor blues',[0,3,5,6,7,10],'♭5 作經過音，避免機械停留。'],['Dorian b2',[0,1,3,5,7,9,10],'旋律小調第二調式，minor sus 的暗色選項。'],['Mixolydian',[0,2,4,5,7,9,10],'一般 dominant，含 9 與 13。'],['Lydian dominant',[0,2,4,6,7,9,10],'#11 dominant，常用於代理屬和弦。'],['Mixolydian b6',[0,2,4,5,7,8,10],'dominant 的 ♭13 色彩。'],['Dominant bebop',[0,2,4,5,7,9,10,11],'大七度是經過音，落拍以和弦音為主。'],['Altered',[0,1,3,4,6,8,10],'♭9 #9 ♭5 ♭13；通常向下一個主和弦解決。'],['Half–whole diminished',[0,1,3,4,6,7,9,10],'dominant ♭9 / #9 / #11 / 13 色彩。'],['Whole tone',[0,2,4,6,8,10],'全音音階：#5 / #11 dominant，避免自然 5。'],['Phrygian dominant',[0,1,4,5,7,8,10],'和聲小調第五調式；小調 V7♭9。'],['Locrian',[0,1,3,5,6,8,10],'半減和弦，含 ♭9 張力。'],['Locrian natural 2',[0,2,3,5,6,8,10],'半減和弦的自然 9，旋律小調第六調式。'],['Whole–half diminished',[0,2,3,5,6,8,9,11],'對稱減音階，適合 dim7。'],['Lydian augmented',[0,2,4,6,8,9,11],'maj7#5 色彩，注意與自然 5 的衝突。']];
catalog.push(['Major blues',[0,2,3,4,7,9],'大五聲加上 ♭3 經過音，3 與 ♭3 的交替形成大調藍調語彙。']);
export function scaleOptions(symbol,{style,key=0}={}){const c=parse(symbol);if(!c)return [];let ids;if(c.q==='5')ids=[5,6,8,9,10,19,0,4];else if(c.q.includes('dim')&&!c.q.includes('m7b5'))ids=[22,17];else if(c.q==='m7b5')ids=[20,21,5];else if(c.minor)ids=[4,5,6,7,8,9,10,11];else if(c.intervals.includes(10))ids=[12,13,14,15,16,17,18,19,10,24,2];else ids=[0,1,2,3,23,24];const out=ids.map(i=>{const [label,ints,note]=catalog[i],pcs=ints.map(n=>mod(n+c.root));const conflicts=c.pcs.filter(n=>!pcs.includes(n));return {name:c.rootName+' '+label,root:c.root,rootName:c.rootName,intervals:ints,label,pcs,note,level:conflicts.length?'色彩／需調整配置':'和弦相容',conflicts:conflicts.map(n=>names[n])};});if(!c.minor&&!c.intervals.includes(10)){const pcs=[0,2,4,7,9].map(n=>mod(n+c.root+2));out.push({root:mod(c.root+2),rootName:names[mod(c.root+2)],label:'Major pentatonic',intervals:[0,2,4,7,9],name:names[mod(c.root+2)]+' major pentatonic / upper structure',pcs,note:'主音上方全音的大五聲：9、3、#11、13、7；用於 Lydian 色彩。',level:'色彩／上層五聲',conflicts:[]});}const profile=worldStyles[style];if(profile){const regional=profile.scaleIds.map(id=>{const sc=worldScales[id],pcs=sc.intervals.map(n=>mod(n+key)),conflicts=[...new Set([...c.pcs,c.bass])].filter(n=>!pcs.includes(n));return {...sc,root:key,rootName:names[key],pcs,name:names[key]+' '+sc.label+' · 樂風音階',level:conflicts.length?'色彩／需調整配置':'和弦相容',conflicts:conflicts.map(n=>names[n])};});return [...regional,...out.filter(s=>!regional.some(r=>r.root===s.root&&r.label===s.label))];}return out;}

export function scaleNotes(scale){const letters=['C','D','E','F','G','A','B'],natural=[0,2,4,5,7,9,11];const start=letters.indexOf((scale.rootName||names[scale.root])[0]);let degrees;
const label=scale.label||'';
if(scale.degrees)degrees=scale.degrees;
else if(label.includes('pentatonic'))degrees=label.startsWith('Minor')?[0,2,3,4,6]:[0,1,2,4,5];
else if(label==='Minor blues')degrees=[0,2,3,4,4,6];
else if(label==='Major blues')degrees=[0,1,2,2,4,5];
else if(label==='Altered')degrees=[0,1,1,2,4,5,6];
else if(label==='Whole tone')degrees=[0,1,2,3,4,6];
else if(label==='Major bebop')degrees=[0,1,2,3,4,4,5,6];
else if(label==='Dominant bebop')degrees=[0,1,2,3,4,5,6,6];
else if(label.includes('diminished'))degrees=label.startsWith('Half')?[0,1,1,2,3,4,5,6]:[0,1,2,3,4,5,5,6];
else degrees=[0,1,2,3,4,5,6];
return scale.intervals.map((n,i)=>{const at=(start+degrees[i])%7;let diff=mod(scale.root+n)-natural[at];while(diff>6)diff-=12;while(diff< -6)diff+=12;return letters[at]+(diff>0?'#'.repeat(diff):'b'.repeat(-diff));});}
// Five overlapping CAGED regions, anchored to the scale's major or relative-major root.
// All seven-note and chromatic scales are fitted to those regions, with note labels rather than implied fingering.
export function scalePositions(scale){const minor=scale.intervals.includes(3)&&!scale.intervals.includes(4),majorRoot=mod(scale.root+(minor?3:0));
const eRoot=mod(majorRoot-4);const regions=[['E',eRoot-1],['D',eRoot+1],['C',eRoot+4],['A',eRoot+6],['G',eRoot+8]].map(([shape,start])=>({shape,start:((start%12)+12)%12})).sort((a,b)=>a.start-b.start);
return regions.map((p,index)=>({...p,index:index+1,end:p.start+4,notes:[40,45,50,55,59,64].flatMap((t,string)=>Array.from({length:5},(_,k)=>p.start+k).filter(f=>scale.pcs.includes(mod(t+f))).map(f=>({string,fret:f,midi:t+f,pc:mod(t+f)})))}));}
