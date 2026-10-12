(function(root){
  const places=[['双唇','Bilabial'],['唇齿','Labiodental'],['齿','Dental'],['齿龈','Alveolar'],['龈后','Postalveolar'],['卷舌','Retroflex'],['硬腭','Palatal'],['软腭','Velar'],['小舌','Uvular'],['咽','Pharyngeal'],['声门','Glottal']];
  const manners=[['塞音','Plosive'],['鼻音','Nasal'],['颤音','Trill'],['闪音','Tap / flap'],['擦音','Fricative'],['边擦音','Lateral fricative'],['近音','Approximant'],['边近音','Lateral approximant']];
  const grid=[['p b','','','t d','','ʈ ɖ','c ɟ','k ɡ','q ɢ','','ʔ'],['m','ɱ','','n','','ɳ','ɲ','ŋ','ɴ','',''],['ʙ','','','r','','','','','ʀ','',''],['','ⱱ','','ɾ','','ɽ','','','','',''],['ɸ β','f v','θ ð','s z','ʃ ʒ','ʂ ʐ','ç ʝ','x ɣ','χ ʁ','ħ ʕ','h ɦ'],['','','','ɬ ɮ','','','','','','',''],['','ʋ','','ɹ','','ɻ','j','ɰ','','',''],['','','','l','','ɭ','ʎ','ʟ','','','']];
  const extras=['pʰ','tʰ','kʰ','t͡s','t͡sʰ','t͡ʂ','t͡ʂʰ','t͡ɕ','t͡ɕʰ','ɕ','ʑ','t͡ʃ','d͡ʒ','kʷ','kʷʰ','w','ɥ','ʍ'];
  const english='p b t d k ɡ m n ŋ f v θ ð s z ʃ ʒ h t͡ʃ d͡ʒ l ɹ j w'.split(' ');
  const profiles={
    mandarin:{label:['普通话','Mandarin'],sounds:'p pʰ t tʰ k kʰ m n ŋ f s ʂ ʐ ɕ x t͡s t͡sʰ t͡ʂ t͡ʂʰ t͡ɕ t͡ɕʰ l j w ɥ'.split(' '),note:['教学式声母＋鼻韵尾＋滑音清单。拼音 b/d/g 是 /p t k/；r 以 /ʐ/ 表示，实际可接近 [ɻ]。j/w/ɥ 的音位地位因分析而异；/ŋ/ 主要在韵尾。','Pedagogical initials + nasal codas + glides. Pinyin b/d/g represent /p t k/. r is shown as /ʐ/ and can be approximant-like [ɻ]. Glide analysis varies; /ŋ/ is a coda.']},
    us:{label:['美式英语 · GA','American · GA'],sounds:english,note:['General American 教学清单。r 以常见音值 ɹ 显示；卷舌/拢舌等实现可变。送气 [pʰ tʰ kʰ] 和闪音 [ɾ] 不作为额外音位高亮。','General American pedagogical inventory; r is displayed as ɹ. Aspiration and flapping are contextual realizations, not extra phonemes.']},
    uk:{label:['英式英语 · SSBE','British · SSBE'],sounds:english,note:['现代标准英格兰南部英语。与 GA 的核心辅音清单相同，但非卷舌性使 r 的分布不同；相同高亮不等于相同发音规则。','Standard Southern British English. The core inventory matches GA, but non-rhoticity changes r distribution. Identical highlights do not imply identical realization.']},
    cantonese:{label:['粤语 · 香港','Cantonese · HK'],sounds:'p pʰ t tʰ k kʰ kʷ kʷʰ m n ŋ f s h t͡s t͡sʰ l j w'.split(' '),note:['香港粤语教学清单；塞擦音用 t͡s 表示，实际部位受语境影响。韵尾 p/t/k 通常不释放，不能套用当前起声实验；n/l、初始 ŋ 有说话人差异。','Hong Kong pedagogical inventory; affricate place varies with context. Coda p/t/k are typically unreleased and unsuitable for this onset task; n/l and initial ŋ vary.']},
    spanish:{label:['西班牙西语','Peninsular Spanish'],sounds:'p b t d k ɡ m n ɲ f θ s x t͡ʃ ʝ l ɾ r'.split(' '),note:['中北部、西班牙式区分 /s θ/、yeísmo 基准。/b d ɡ/ 元音间常弱化为近音，不能默认每个 aba 都有爆破。ʎ 属于保留 ll/y 区分的变体；滑音分析可变。','North-central Peninsular distinción + yeísmo reference. Intervocalic /b d ɡ/ often weaken to approximants: aba need not contain a burst. /ʎ/ belongs to non-yeísta varieties; glide analysis varies.']}
  };
  const api={places,manners,grid,extras,profiles};if(typeof module==='object')module.exports=api;else root.ConsonantData=api;
})(globalThis);
