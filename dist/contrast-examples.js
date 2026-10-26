import {darkContrasts} from './dark-styles.js?v=2.0.0-alpha.9';
// Four original contrasting studies per style, in project tonic C.
// Mood is a listening suggestion, not a claim about a tradition or a source song.
// Order: bright / melancholy / dreamy / tense. Explicit modes prevent major/minor relabelling.
const charts={
 Jazz:[
 'major;Fmaj9|Em7 A7|Dm9 G13|C69',
 'minor;Cm9|Fm9|Dm7b5 G7b9|Cm6',
 'major;Cmaj9#11|D/C|Fmaj9/C|C69',
 'minor;Dm7b5 G7alt|CmMaj9 C7b9|Fm9 Bb7#11|Ebmaj9 G7b9'],
 Gospel:[
 'major;F69|C/E Am7|Dm7 G13|C69',
 'minor;Cm9|Abmaj9|Fm9 G7b9|Cm/G G7',
 'major;Cmaj9/E|Fmaj9|Dm11/G|C69',
 'major;C/E Ebdim7|Dm9 Db7|C/G A7b9|Dm7 G7b9'],
 Fusion:[
 'major;Fmaj7#11|Em9 A13|Dmaj9|G13',
 'minor;CmMaj9|Abmaj9#11|Fm11|G7alt',
 'major;Cmaj9#11|Dmaj9#11|Bbmaj9#11|Cmaj9#11',
 'minor;Cm9 F7#11|Bmaj9|Bb7#11|Ebmaj9 G7alt'],
 'Bossa nova':[
 'major;F69|Em7 A7|Dm9 G13|C69',
 'minor;Cm6|Fm9 Bb13|Ebmaj9 Abmaj9|Dm7b5 G7b9',
 'major;Cmaj9|D7#11|Dm9/G|C69/E',
 'minor;CmMaj7 Cm7|F9|Fm6 Abdim7|G7b9'],
 Rock:[
 'major;Fadd9|C/E|Gsus4 G|Cadd9',
 'minor;Cm|Ab|Fm|Gsus4 G',
 'major;Cadd9|Bbadd9|Fadd9/C|Csus2',
 'minor;Cm:2 Db:2|Ab|Fm:2 G:2|Gsus4:2 G:2'],
 'Japanese rock':[
 'major;Fadd9|G|C/E Am7|Dm7 G',
 'minor;Cm|Abmaj7|Fm7 Bb7|Eb G7',
 'major;Fmaj9|G/F|Em9|Am11',
 'major;Fmaj7 Fm6|Em7 E7|Am Am/G|F#m7b5 B7'],
 House:[
 'major;Fmaj9|G13|C69|Am9',
 'minor;Cm9|Abmaj9|Fm11|Gm9',
 'major;Cmaj9|D/C|Fmaj9/C|Cmaj9#11',
 'minor;Cm9|Dbmaj9|Fm9|G7sus4 G7b9'],
 Classical:[
 'major;F/A|G/B|C/E F|G7 C',
 'minor;Cm|Fm/Ab|Dm7b5/F G7|Cm',
 'major;Cmaj7|Fmaj7/C|Dm7/C|C6',
 'minor;Cm/B|Cm/Bb|Adim7 Ab|Dm7b5 G7b9'],
 'Phrygian dominant':[
 'major;C|Ab|Db|C/G C',
 'minor;Fm|Db|Bbm|C',
 'modal;C5|Dbmaj7/C|Ab/C|C5',
 'modal;Db:2 C:2|Bbm:2 C7b9:2|Fm:2 Db:2|C7b9'],
 'Dorian folk':[
 'modal;F|Cm6|Bb F|Cm',
 'modal;Cm9|Gm7|Dm7|Cm',
 'modal;Cm11|F/C|Bb/C|Cm9',
 'modal;Dm7:2 Cm:2|F:2 Gm7:2|Bb:2 Dm7:2|Cm6'],
 Soul:[
 'major;F69|C/E|Dm9 G13|C69',
 'minor;Cm9|Abmaj7|Fm9|G7b9',
 'major;Cmaj9|Fmaj9/C|Dm11/G|C69',
 'major;Fmaj9 Fm6|C/E Ebdim7|Dm9 Db9|C69 A7alt'],
 'R&B':[
 'major;Fmaj9|Em7 Am9|Dm9 G13|C69',
 'minor;Cm9|Abmaj9|Fm9|G7sus4 G7b9',
 'major;Cmaj9|Bbmaj9/C|Fmaj9/C|Cmaj9',
 'minor;Dm7b5 G7alt|Cm9 Bb13|Abmaj9|G7b9'],
 Funk:[
 'major;C13|F9|C9|G13 F9',
 'minor;Cm9|Fm9|Ab9|G7#9',
 'modal;Cm11|F13/C|Bbmaj9/C|Cm9',
 'minor;C7#9 Db9|C7#9|F9 Gb9|G7#9'],
 EDM:[
 'major;Fadd9|G|Cadd9|C/E',
 'minor;Cm|Ab|Fm|Bb',
 'major;Cmaj9|Gsus4|Fmaj9|Am11',
 'minor;Cm|Db|Ab|Gsus4 G'],
 'Lo-fi hip-hop':[
 'major;F69|Em9|Dm9 G13|Cmaj9',
 'minor;Cm9|Fm9|Abmaj7|G7b9',
 'major;Cmaj9|Bbmaj9|Fmaj9/C|Cmaj9',
 'minor;CmMaj7 Cm7|F9|Abmaj7 Db9|G7alt'],
 Chill:[
 'major;F69|Cadd9/E|Dm9|G6',
 'minor;Cm9|Abmaj9|Ebmaj9/G|Fm9',
 'major;Cmaj9#11|Fmaj9/C|D/C|Cmaj9',
 'minor;CmMaj9|Abmaj9|Dbmaj9|G7sus4'],
 'Neo-soul':[
 'major;Fmaj9|Em9 Am9|Dm11 G13|C69',
 'minor;Cm9|Fm11|Abmaj9|G7b9',
 'major;Cmaj9/E|Ebmaj9|Dm11/G|Cmaj9',
 'minor;Dm7b5 Db7#11|Cm9 B7alt|Bb9 A7alt|Abmaj9 G7alt'],
 'American pop':[
 'major;Fadd9|G|C|Am7',
 'minor;Cm|Ab|Fm|Gsus4 G',
 'major;Cadd9|Gsus2/B|Am7|Fmaj9',
 'major;C|E7|Am|F Fm'],
 Mandopop:[
 'major;Fadd9|G|C/E Am7|Dm7 G',
 'minor;Cm|G/B|Abmaj7|Fm G7',
 'major;Cmaj9|Gadd9/B|Am9|Fmaj9',
 'major;F Fm|C/E E7|Am Am/G|Dm7 G7b9'],
 'K-pop':[
 'major;F69|G13|Em7 Am9|Dm7 G13',
 'minor;Cm9|Abmaj9|Fm9|G7b9',
 'major;Cmaj9|Bbmaj9/C|Fmaj9|Fm9',
 'major;Fmaj9 Fm9|Em9 A7alt|Dm11 Db7#11|Cmaj9 E7#9'],
 'Major blues':[
 'major;C6 C7|F9|C6|C9|F9|F13|C6|A7|Dm9|G13|C6 A7|Dm7 G13',
 'major;C7|F7 Fm6|C7/G|C7|F7|Fm6|C/G|A7b9|Dm7|G7b9|C7|G7b9',
 'major;C9sus4|F13/C|C9|C9sus4|F13|F9|C9|A9sus4|Dm11|G9sus4|C9|G7sus4(9,13)',
 'major;C7 Ebdim7|F9 F#dim7|C/G|Gm7 C7b9|F9|F#dim7|C/G|A7b9|Dm9|Db7#11|C9 A7alt|Dm9 G7alt'],
 'Minor blues':[
 'minor;Cm6|F9|Cm6|C7|Fm6|Fm6|Cm6|A7b9|Dm7b5|G7|Cm6|Dm7b5 G7',
 'minor;Cm9|Fm9|Cm9|Cm9|Fm9|Fm9|Cm9|Cm9|Ab7|G7b9|Cm6|G7b9',
 'minor;Cm11|Fm9/C|Abmaj9/C|Cm9|Fm11|Fm9|Cm11|Cm9|Abmaj9|G7sus4|Cm9|G7sus4',
 'minor;CmMaj7 Cm7|Fm6 Ab7|Cm6|C7b9|Fm6|F#dim7|Cm/G|A7alt|Dm7b5|Db7#11|Cm6|G7alt'],
 'Neoclassical rock':[
 'minor;Eb|Bb/D|Ab/C|Bb',
 'minor;Cm|Abmaj7|Fm|G7',
 'minor;Cmadd9|Abmaj7/C|Ebmaj7/C|Cmadd9',
 'minor;Cm/B|Ab|F#m7b5|G7b9'],
 'Nu-disco':[
 'major;Fmaj9|G13|Em7 Am9|Dm9 G13',
 'minor;Cm9|Abmaj9|Fm9|Bb13',
 'major;Cmaj9|Fmaj9/C|Bbmaj9|C69',
 'minor;Cm9 Db9|Cm9|F13|G7#9'],
 Ambient:[
 'major;Fmaj9|C69/E|G6|Cmaj9',
 'minor;Cm9|Abmaj9|Fm11|Cm9/G',
 'major;Cmaj9#11|D/C|Gmaj9/C|Cmaj9',
 'minor;CmMaj9|Dbmaj9/C|Abmaj9/C|G7sus4'],
 'Greek Hijaz':[
 'modal;Ab(no5)|Db|C/G|C',
 'modal;Fm|Bbm|Db|C',
 'modal;C5|Ab(no5)/C|Dbmaj7/C|C5',
 'modal;Db:2 C:2|Bbm:2 Fm:2|Db/C|C7b9'],
 'Japanese Hirajoshi':[
 'modal;Abmaj7|Cmadd9|Abmaj7/G|Cm',
 'modal;Cm|G5|Cmadd9|Abmaj7/C',
 'modal;C5|Abmaj7/C|Cmadd9/G|C5',
 'modal;Cmadd9:2 G5:2|Abmaj7/G|Cm:2 G5:2|Cmadd9'],
 'Japanese In-sen':[
 'modal;Bbsus2|Fsus4|Csus4|C5',
 'modal;Csus4|Db(no5)|Bbsus2/C|Csus4',
 'modal;C5|Fsus4/C|Bbsus2/C|C5',
 'modal;Db(no5)/C|C5:2 Db(no5):2|Fsus4/C|Csus4'],
 'Ghana Highlife':[
 'major;F6|C/E|Dm7 G7|C6',
 'minor;Am7|Dm7|Fmaj7|Em7',
 'major;Cmaj9|Fmaj9/C|G6|C69',
 'major;Dm7:2 G7:2|Em7:2 Am7:2|F:2 G7:2|C6'],
 'Ethiopian Tizita':[
 'modal;C6|Em7(no5)|Am7|C69',
 'modal;Am7|Em7(no5)|Cadd9|Am7',
 'modal;C5|C69|Am7/C|Cadd9',
 'modal;Em7(no5):2 Cadd9:2|Am7|Em7(no5)/C|C69'],
 'Hawaiian Slack-key':[
 'major;F6|C/E|G7|C69',
 'minor;Am|Em/G|Fmaj7|E7',
 'major;Cmaj9|Fmaj9/C|G6|Cadd9',
 'major;C E7/G#|Am A7|Dm7 D7|G7'],
 'Native Flute':[
 'modal;Bbsus2/C|Fsus4/C|Cm7/C|C5',
 'modal;Cm7|Cm7/C|Bbsus2/C|Cm7',
 'modal;C5|Fsus4/C|C5|Bbsus2/C',
 'modal;Fsus4/C:2 Cm7/C:2|Bbsus2/C|Fsus4/C|Cm7/C'],
 'Indian Bhupali':[
 'modal;C69|Cadd9|Em7(no5)/C|C6',
 'modal;Am7/C|Em7(no5)/C|Am7/C|C5',
 'modal;C5|Cadd9|C69|C5',
 'modal;Em7(no5)/C|Cadd9:2 Am7/C:2|C69|C5'],
 'Indian Yaman':[
 'modal;D/C|Gmaj7/C|C69|Cmaj7',
 'modal;Am9/C|Em7/C|Bm7/C|Cmaj7',
 'modal;Cmaj9#11|Gmaj7/C|D/C|C5',
 'modal;Bm7/C|D/C:2 Cmaj7#11:2|Bm7/C|Cmaj9'],
 Afrobeats:[
 'major;Fadd9|G6|C69|Am7',
 'minor;Am7|Dm9|Fmaj7|Em7',
 'major;Cmaj9|G6/C|Fmaj9/C|C69',
 'major;Dm7:2 G7:2|Am7|F6:2 G7:2|Cadd9'],
 Amapiano:[
 'minor;Ebmaj9|Bb6|Abmaj9|Cm9',
 'minor;Cm9|Fm9|Abmaj9|Gm7',
 'minor;Cm11|Abmaj9/C|Bb9sus4/C|Cm9',
 'minor;Cm9 Db9|Fm9|Dm7b5|G7alt'],
 Reggaeton:[
 'minor;Eb|Bb|Ab|Cm',
 'minor;Cm|Fm|Ab|Gm',
 'minor;Cm9|Abmaj9|Ebmaj9|Bb9sus4',
 'minor;Cm:2 Bb:2|Ab:2 Bb:2|Fm|Gm'],
 Dancehall:[
 'minor;Eb|Bb|Cm|Ab',
 'minor;Cm|Fm|Cm/G|Gm',
 'minor;Cm11|Bb9sus4/C|Abmaj9|Cm9',
 'minor;Fm:2 Cm:2|Bb:2 Ab:2|Fm|Gm'],
 'Latin Pop':[
 'major;F|G|C/E|Am',
 'minor;Cm|Fm/Ab|Abmaj7|G7',
 'minor;Cm9|Abmaj9|Ebmaj9/G|Bb9sus4',
 'minor;Fm Ab7|Eb G7|Cm Bb|Ab G7b9'],
 Flamenco:[
 'modal;Ab|Eb|Db|C',
 'modal;Fm|Bbm|Db|C',
 'modal;C5|Dbmaj7/C|Ab/C|Fm/C',
 'modal;Fm:2 Eb:2|Db:2 C:2|Bbm:2 Db:2|C7b9'],
 'Arabic Hijaz':[
 'modal;Ab(no5)/C|Db/C|C5|C',
 'modal;Fm/C|Bbm/C|Db/C|C',
 'modal;C5|Dbmaj7/C|Ab(no5)/C|C5',
 'modal;Db/C:2 C:2|Fm/C:2 Bbm/C:2|Db/C|C7b9'],
 'Celtic Dorian':[
 'modal;F|Bb|Cm6|F Cm',
 'modal;Cm|Gm7|Dm7|Cm9',
 'modal;C5|Bb/C|F/C|Cm11',
 'modal;Dm7:2 Cm:2|F:2 Bb:2|Gm7|Cm6']
};
export const moodOrder=['bright','melancholy','dreamy','tense'];
export const moodLabels={bright:'明亮・輕快',melancholy:'憂鬱・深夜',dreamy:'夢幻・雲端',tense:'緊張・暗巷'};
export const contrastExamples=Object.fromEntries(Object.entries(charts).map(([style,rows])=>[style,rows.map((row,i)=>{const [mode,chart]=row.split(';');return {id:`contrast-${style}-${moodOrder[i]}`,style,type:'study',key:0,mode,category:moodOrder[i],mood:moodLabels[moodOrder[i]],chart:`| ${chart.split('|').join(' | ')} |`,feel:{gate:[78,90,98,62][i],human:[30,55,60,25][i]},open:i===2};})]));

Object.assign(contrastExamples,darkContrasts);
