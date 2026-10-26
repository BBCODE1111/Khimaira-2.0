# KHIMAIRA 2.0 · Melody Lab

旋律先行的和弦實驗室。**2.0.0-alpha.7，先驗證網頁，再開發 DAW 外掛。**

- [開啟 2.0](https://bbcode1111.github.io/Khimaira-2.0/)
- [保留的 1.0 網站](https://bbcode1111.github.io/Khimaira/)
- [1.0 原專案](https://github.com/BBCODE1111/Khimaira)

這是獨立的新專案，沒有覆寫舊網站或舊版安裝包。

## Alpha 6：先做好正拍範例的基本配奏

以內建 108 BPM 正拍旋律為基準，先從旋律找出 C–Am–F–G 的和弦骨架，最後一小節 G–C 收束。樂風生成先保留這個骨架，再加相容的六、七、九和弦或 power chord 色彩；不再為了「每次不一樣」任意換根音或半小節拆段。這套判定讀取旋律音符，沒有依範例名稱硬編固定和弦；旋律改變時會重新判定。無法用整小節和弦承接時，仍會拆段或使用原本的安全候選。

伴奏以樂風音型為底，在旋律強拍與新的和聲到達處加入清楚低音支點，和聲開頭對齊旋律起拍。密集旋律時減輕離拍填充；Ambient 保留長音，Jazz/Bossa/House 等保留各自切分，不把所有伴奏改成齊奏旋律。

新增「同一段旋律，比較基本配奏」八個快捷鍵：Pop、Rock、Jazz、Bossa、House、Classical、Lo-fi、Ambient。載入「旋律 MIDI 範例」，選樂風後按 PLAY；播放中切換會從頭比較。GENERATE 可繼續變化和弦色彩，和弦骨架保持合適時不強迫換掉。MIDI 仍只匯出伴奏。

實際測量鋼琴採樣有約 4.8–15.7ms 起音前導，旋律模式現在補償這段前導；旋律和鋼琴共用壓縮器路徑，避免額外的相對延遲。在 44.1kHz 離線音訊的 C4 單音檢查中，校正後兩者起音差約 1.4ms；這不是所有裝置／音色的延遲保證。

## Alpha 5：固定拍格、直接畫音符、只匯出伴奏

修正短和弦段落會重啟樂風節奏的問題：伴奏節奏以完整小節產生，再於每次起音套用當下和弦的聲部。換和弦不重啟重拍／切分節奏。旋律配和的必要拆段固定在半拍格上，保留旋律原有微時差；長音與 ARP 保留各自的延留／全域步進方式。播放游標與旋律、伴奏共用同一條拍數時間線。

按「＋ 自己畫旋律」即可從空白開始。在「畫音符」模式點一下新增、拖曳決定音長；「橡皮擦」點音符刪除。「選取／框選」可拖曳空白選多音，Shift 點選加選，拖任一選取音符整批移動。支援全選、複製、刪除全部後復原、整批升降音／前後移／縮短延長。手機提供 44px 以上操作按鈕、較高音符格與移動畫面工具。常用工具列固定在音符區上方；數值表移到進階明細，音高改用 C4 等音名選單。

主要 MIDI 下載及拖曳輸出**只包含和弦伴奏**，參考旋律不寫入檔案，也不建立空白旋律軌。保留速度圖與拍號；匯出仍用參考旋律檢查衝突。伴奏起訖向內取整到 MIDI tick，避免觸及未取整的原音參考。瀏覽器直接拖到外部 DAW 是否接受取決於瀏覽器／DAW；可一律下載 `.mid` 後拖入。

## Alpha 4：真實音訊、可變和弦與連續演奏

音訊辨識改用本機 Web Worker 中的 Spotify Basic Pitch 模型（Apache-2.0）與單旋律路徑解碼，抑制短暫八度跳動、合併短暫掉音並保留明確重複起音。模型與 WASM 自行託管；音檔不會送到 Spotify 或其他分析服務。模型不是人聲分離器，濕聲、滑音與多聲部仍需校正。

BPM／調性若包含在常見素材檔名中（例如 `phrase_80_Dmaj.wav`），優先採用並顯示「檔名標記」，保留 loop 開頭休止；沒有標記時使用估計並請使用者確認。可手動更改、半速／倍速或 TAP 定速。音訊匯入後先比較原音與辨識結果，再按「確認旋律並配和弦」；MIDI 仍直接讀取音高與速度圖。檔名資訊不是聲學辨識的真值。

GENERATE 現在直接在與旋律相容的候選中選擇樂風和弦，使用半小節為主要和聲變化單位，並比較最後顯示的結果是否改變。真的沒有其他結果時會說明限制。LOAD 仍載入輸入框中的原譜；套用樂風請按 GENERATE。

預設「流暢配和」容許大二度／小七度色彩，仍排除半音與三全音衝突；「嚴格配和」保留原本排除所有二度／七度的規則。介面及 MIDI 檢查會使用所選規則。

演奏保留共同長音跨和弦延留；不相容的裝飾音優先改配到鄰近的相容和弦音，而不是整個拍點刪除。放音尾韻只延伸到下一個衝突旋律音或同音重奏之前，MIDI 匯出也檢查這些實際發聲長度。新增 Warm lead 與 Soft keys 旋律音色，保留 Pure sine 作音高對照，預設旋律音量仍為 35%。

## Alpha 3：直接編輯旋律 MIDI

中間鋼琴捲軸的藍色旋律音符可直接拖曳：上下改音高、左右改開始時間，左右邊緣調整音長。提供 1/4、1/8、三連音、1/16、1/32 拍點吸附及自由移動，Alt 暫時取消吸附；水平縮放 50–400%。金色伴奏顯示實際演奏，依編輯後的旋律重新檢查與改配。

Alpha 3 原先以雙擊新增／數值精修；Alpha 5 改以畫音符、框選與批次工具為主。點選後可用方向鍵移動、Shift＋上下移八度、Delete 刪除，⌘ / Ctrl＋Z 復原、Shift＋⌘ / Ctrl＋Z 重做；也提供按鈕，最多保留 50 次音符編輯。一次拖曳算一次編輯，Esc 取消拖曳。匯入新旋律或切換旋律軌時重置編輯紀錄；改速度／音訊起拍位置時重置，以免套用舊拍點。

修改音訊辨識結果後會切回「辨識音符」試聽；原始錄音不會跟著移調或拉伸。播放使用編輯後的旋律；Alpha 5 的伴奏 MIDI 依編輯後旋律檢查，但不匯出旋律。

## Alpha 2：1.0 工作台與旋律功能融合

保留 1.0 的原介面、48 種樂風、和弦雕塑／轉位／COLOR／ii–V、改寫自由度、密度、變化幅度、UNDO／KEEP、完整演奏與 ARP 控制、吉他工具及 Salamander 鋼琴採樣。旋律匯入是選用功能；未匯入時延續原本的和弦工作流程，使用獨立的 2.0 瀏覽器設定，不覆寫 1.0 設定。

匯入旋律後，GENERATE 仍先用 1.0 的樂風引擎產生候選，安全選項會保留；不相容的和弦與斜線低音會改配、拆段或留白。所有演奏模式再檢查實際音符；不相容的附加演奏音會優先改配，無解時縮短或省略並顯示數量。手動和弦編輯也遵守此規則，因此旋律限制可能讓結果比無旋律時保守。

旋律預設 **35%**，和聲 **100%**，音量可在播放中調整，無需重播。Alpha 2 的辨識音符原先使用較輕的正弦音（Alpha 4 改為可選旋律合成器）；和聲使用與 1.0 相同的 17 個鋼琴採樣及濾波。原音訊只做向下的響度控制，防止大音量錄音蓋過和聲。旋律模式的鋼琴尾韻依下一個不相容旋律音或同音重奏收尾；無旋律模式維持原本自然尾韻。

## 使用方式

1. 放入旋律 MIDI，或乾淨的單音 WAV／瀏覽器可解碼的音訊。也能按「＋ 自己畫旋律」從空白繪製，或載入範例。
2. MIDI 選擇旋律軌；音訊會估計音高、音符起訖與 BPM。檢查速度、半速／倍速、調性與拍號。音訊有前導空白時可設定第 1 拍位置。
3. 音訊先交替聽「原音訊」與「辨識音符」，確認後按「確認旋律並配和弦」。直接拖曳鋼琴捲軸中的藍色音符修改音高／時間；用框選整批編輯，或展開進階音符明細。
4. 基本和弦會自動生成。從原本 48 種樂風選擇，再按 GENERATE 或進階改寫手法比較不同結果。演奏方式、ARP 與和弦改寫可分開控制。
5. 同步播放辨識旋律或原音訊與伴奏；下載或拖曳伴奏 MIDI 帶回 DAW。MIDI 只含和弦伴奏、速度圖與拍號，不含參考旋律。

所有使用者檔案都在瀏覽器記憶體中處理，沒有上傳 API。和弦工作台設定存於本機；旋律音訊與分析內容只在記憶體，重新整理會清除參考旋律與尚未保留的旋律編輯；目前的伴奏 MIDI 不備份旋律。字型可能由 Google Fonts 載入；網站由 GitHub Pages 提供。

## 「旋律保護」的定義

每個實際伴奏音在整個持續時間內，依所選規則檢查所有重疊旋律音。流暢配和排除小二度、大七度與三全音；嚴格配和再排除大二度與小七度（不論八度）。若整小節找不到可用和弦，就在半拍拍格拆段；仍無選項則留白 `N.C.`。

候選和弦先過濾，再依調性、旋律支撐、聲部共同音與樂風偏好選擇；生成節奏、低音及分解音後再次檢查。匯出會重新解析量化後的 MIDI，再檢查一次，失敗就拒絕下載。

這項保證只涵蓋**目前辨識／修正後的旋律音符與產生的伴奏事件**，不是所有樂理或美感的通用保證。旋律本身的多音衝突、和弦內部的爵士張力、DAW 音色的 release／殘響、原音訊的誤辨識都不在這個保證內。嚴格限制可能讓爵士延伸音變少，也可能讓多次變化保留相同和弦。

## 已知限制

- 音訊分析適用乾淨單音旋律；不是完整歌曲的人聲分離或複音轉譜。目前主旋律解碼範圍為 MIDI 36–96；低音、氣聲、滑音、和聲人聲、殘響或強背景聲可能誤判。
- 音訊 BPM 是啟發式估計，可能半速／倍速或抓錯節拍；拍號、弱起位置需人工確認。第一版以固定 BPM 對齊音訊，不追蹤自由速度，也不做 time-stretch。修改音訊 BPM 會重畫拍格，原音速度與音高維持不變。
- MIDI 直接讀取音符及速度事件；沒有速度事件時依標準使用 120 BPM 並提示。可保留 MIDI 多段速度變化，或手動改成固定速度。
- MIDI 支援 SMF type 0/1、PPQ、一般音符及延音踏板；排除 CH 10 鼓軌。暫不支援 SMPTE、type 2、變換拍號和含非中央 Pitch Bend 的旋律軌。MPE、SysEx 調音、CC 微調音高與表情不會還原，請先匯成乾淨音訊；匯出 MIDI 使用等律音高和簡化音色。
- 調性推估只比較十二主音的大調／小調，不能可靠判定轉調或所有調式；短旋律可能同時符合多個調性。匯入旋律時仍可選地域樂風，旋律保護優先於樂風音階約束，結果不保證保留完整地域調式。
- 音訊最長 120 秒、40 MB；MIDI 最多 8 MB；所選旋律最多 2,000 音與 512 個四分音符拍。
- 音訊音符靠近小節線時，幾毫秒的提前也可能觸發嚴格拆段；目前優先保持實際時間，不自動量化改寫旋律。
- 和聲使用與 1.0 相同的 Salamander Grand Piano 採樣，來源與 CC BY 3.0 授權見 [About](https://bbcode1111.github.io/Khimaira-2.0/research.html)。只在本機 Chromium 瀏覽器實測；尚未完成 Safari、Firefox、行動裝置實機或各 DAW 的兼容驗證。響應式排版不等於完成所有裝置音訊測試。
- 尚無帳號、專案儲存、原音 WAV 混音匯出、即時 DAW transport、VST3／AU／AAX 2.0。

## 本機執行

使用 Node.js 20+（測試）及 Python 3（靜態伺服器），不需 npm 套件。

```sh
node --test tests/*.test.js
python3 -m http.server 5180 --directory dist
```

打開 `http://localhost:5180`。ES modules 和 Worker 需要 HTTP，請勿直接雙擊 `index.html`。重新產生原創測試素材：`node scripts/make-fixtures.mjs`。

## 驗證與後續門檻

[驗證紀錄](docs/VALIDATION.md) · [實作架構](docs/ARCHITECTURE.md)

先用真實的哼唱、鋼琴單音、不同 BPM、弱起及跨小節長音做聽感驗證，再決定 2.0 外掛規格。單一原創合成旋律的成功，不能代表真實錄音的準確率。


## 重建音訊辨識模組

`pnpm install --frozen-lockfile --ignore-scripts` 後執行 `pnpm build:transcriber`。依賴版本與 TensorFlow 覆寫由 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 固定；產物放在 `dist/vendor/`，Pages 直接部署已提交的產物。`src/neural-runtime.js` 控制模型載入、推論與張量釋放；取消分析會終止 worker。

## Tempo and melody mute · alpha 7

After confirming an audio transcription, BPM changes preserve musical beat positions, note edits and bar count, matching MIDI and drawn melodies. Only the initial audio-review step reinterprets seconds to correct the detected beat grid. Playback tempo changes restart melody and accompaniment together from the selected bar. At a tempo different from the source, audition switches to the recognized notes to preserve pitch; original-waveform time stretching is not implemented, and original audition becomes available again at the calibrated source BPM.

The separate **旋律 ON / MUTE** button changes only the melody bus, instantly during playback, preserving the chosen audition source and volume. MIDI export remains accompaniment-only.
