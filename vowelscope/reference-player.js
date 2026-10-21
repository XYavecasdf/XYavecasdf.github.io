/* Articulatory teaching references; independent of microphone/formant estimates. */
(() => {
  'use strict';
  const revision = '81c8086257d84f5e434790603bb39b901df8143c';
  const repository = 'https://github.com/NewDanishPhonetics/IPA-sound-files';
  const recordings = new Set('a e i o u y æ ø œ ɑ ɒ ɔ ɛ ɤ ɯ ɶ ʌ'.split(' '));
  // Explicit IPA categories, not an inversion of schematic/measured F1/F2.
  // openness: close=0, open=6; frontness: back=0, front=4.
  const categories = [
    ['i',0,4,0],['y',0,4,1],['ɨ',0,2,0],['ɵ',2,2,1],['ɯ',0,0,0],['u',0,0,1],
    ['ɪ',1,3,0],['ʊ',1,1,1],['e',2,4,0],['ø',2,4,1],['ɤ',2,0,0],['o',2,0,1],
    ['ə',3,2,2],['ɛ',4,4,0],['ɜ',4,2,0],['œ',4,4,1],['ʌ',4,0,0],['ɔ',4,0,1],
    ['æ',5,4,0],['ɐ',5,2,2],['a',6,4,0],['ɑ',6,0,0],['ɒ',6,0,1],['ʉ',0,2,1],
    ['ʏ',1,3,1],['ɘ',2,2,0],['ɞ',4,2,1],['ɶ',6,4,1]
  ];
  const vowels = Object.freeze(Object.fromEntries(categories.map(([symbol, height, backness, rounding]) => [symbol,
    Object.freeze({openness:height/6, frontness:backness/4, height, backness,
      rounding:['unrounded','rounded','unspecified'][rounding],
      audio:recordings.has(symbol) ? Object.freeze({
        url:`https://raw.githubusercontent.com/NewDanishPhonetics/IPA-sound-files/${revision}/${encodeURIComponent(symbol)}.wav`,
        source:`${repository}/blob/${revision}/${encodeURIComponent(symbol)}.wav`,
        author:'Ruben Schachtenhaufen', license:'CC0-1.0'
      }) : null})])));
  const copy = {
    en: {
      height:['Close','Near-close','Close-mid','Mid','Open-mid','Near-open','Open'],
      backness:['Back','Near-back','Central','Near-front','Front'],
      rounding:{rounded:'Rounded lips', unrounded:'Unrounded lips', unspecified:'Rounding not specified'},
      ready:'Ready to listen', loading:'Loading reference…', playing:'Playing reference…',
      stopped:'Playback stopped', unavailable:'No verified recording for this vowel yet.',
      failed:'Unable to load audio. Retry or open the recording source.',
      blocked:'Playback was blocked. Press Replay to try again.',
      unsupported:'Audio playback is unavailable in this browser.',
      source:'Recording: Ruben Schachtenhaufen · CC0', missingSource:'Browse recording collection',
      diagram:'Schematic side view, mouth facing right',
      instruction:'Tongue root ← → Tongue tip',
      label:s => `Illustrative tongue position for [${s}]`,
    },
    zh: {
      height:['闭','次闭','半闭','中','半开','次开','开'],
      backness:['后','次后','央','次前','前'],
      rounding:{rounded:'圆唇', unrounded:'不圆唇', unspecified:'圆唇性未指定'},
      ready:'可以播放参考音', loading:'正在加载参考音…', playing:'正在播放参考音…',
      stopped:'已停止播放', unavailable:'此元音暂缺已核实的真人录音。',
      failed:'无法加载录音，可重试或打开录音出处。',
      blocked:'浏览器阻止了播放，请按「重播」重试。',
      unsupported:'此浏览器暂不支持音频播放。',
      source:'录音：Ruben Schachtenhaufen · CC0', missingSource:'浏览录音资料库',
      diagram:'口朝右的侧面舌位示意', instruction:'舌根 ← → 舌尖',
      label:s => `[ ${s} ] 的舌位示意`,
    }
  };

  function create({document, locale='en', beforePlay=() => {}}) {
    const text = copy[locale] || copy.en;
    const $ = id => document.getElementById(id);
    let selected = null, audio = null, generation = 0, animation = null;
    let pose = {x:185, y:130, rounded:0};
    const status = message => { $('referenceAudioStatus').textContent = message; };

    function draw(next) {
      pose = next;
      const {x, y, rounded} = next;
      const path = `M 126 205 C 111 170 122 ${y+30} ${x-24} ${y+8} C ${x-8} ${y-8} ${x+19} ${y-9} ${x+34} ${y+6} C ${x+48} ${y+24} 239 156 264 165 C 252 186 213 191 179 210 Z`;
      $('referenceTongue').setAttribute('d', path);
      $('referenceTonguePoint').setAttribute('cx', x+7);
      $('referenceTonguePoint').setAttribute('cy', y-1);
      $('referenceLips').setAttribute('rx', 3+rounded*7);
      $('referenceLips').setAttribute('ry', 13-rounded*5);
      $('referenceLipShape').setAttribute('rx', 16-rounded*7);
      $('referenceLipShape').setAttribute('ry', 4+rounded*5);
    }

    function move(vowel) {
      if (animation !== null) window.cancelAnimationFrame?.(animation);
      // Keep the illustrative dorsum below the drawn hard palate. These
      // screen-space coordinates are not measured articulatory dimensions.
      const target = {x:156+vowel.frontness*60, y:112+vowel.openness*44,
        rounded:vowel.rounding === 'rounded' ? 1 : 0};
      if (!window.requestAnimationFrame || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        draw(target); return;
      }
      const start = {...pose};
      let began = null;
      const frame = now => {
        began ??= now;
        const t = Math.min(1, (now-began)/440), ease = t*t*(3-2*t);
        draw(Object.fromEntries(Object.keys(target).map(key => [key, start[key]+(target[key]-start[key])*ease])));
        animation = t < 1 ? window.requestAnimationFrame(frame) : null;
      };
      animation = window.requestAnimationFrame(frame);
    }

    function stop(announce=true) {
      generation++;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audio = null;
      }
      $('referenceStop').disabled = true;
      if (announce && selected) status(vowels[selected].audio ? text.stopped : text.unavailable);
    }

    function play() {
      stop(false);
      const reference = vowels[selected]?.audio;
      if (!reference) { status(text.unavailable); return; }
      if (!window.Audio) { status(text.unsupported); return; }
      // Cancel capture synchronously, including a pending permission request.
      // Do not let speaker output become a microphone measurement.
      beforePlay();
      const token = generation;
      const current = () => token === generation;
      const failed = message => {
        if (!current()) return;
        stop(false); status(message);
      };
      try {
        audio = new window.Audio();
        audio.preload = 'none'; audio.volume = .65; audio.src = reference.url;
        audio.addEventListener('playing', () => { if (current()) status(text.playing); });
        audio.addEventListener('ended', () => { if (current()) { stop(false); status(text.ready); } });
        audio.addEventListener('error', () => failed(text.failed));
        $('referenceStop').disabled = false;
        status(text.loading);
        Promise.resolve(audio.play()).catch(error => failed(error?.name === 'NotAllowedError' ? text.blocked : text.failed));
      } catch (_) { failed(text.failed); }
    }

    function select(symbol) {
      const vowel = vowels[symbol];
      if (!vowel) return;
      selected = symbol;
      $('referenceDemo').hidden = false;
      $('referenceSymbol').textContent = `[ ${symbol} ]`;
      $('referenceArticulation').textContent = [text.height[vowel.height],
        text.backness[vowel.backness], text.rounding[vowel.rounding]].join(' · ');
      $('referenceDiagram').setAttribute('aria-label', `${text.label(symbol)} · ${text.diagram}`);
      $('referenceDirection').textContent = text.instruction;
      for (const id of ['referenceLips', 'referenceLipShape']) {
        $(id).setAttribute('visibility', vowel.rounding === 'unspecified' ? 'hidden' : 'visible');
      }
      $('referenceLipUnknown').setAttribute('visibility', vowel.rounding === 'unspecified' ? 'visible' : 'hidden');
      $('referenceReplay').disabled = !vowel.audio;
      $('referenceSource').href = vowel.audio?.source || repository;
      $('referenceSource').textContent = vowel.audio ? text.source : text.missingSource;
      move(vowel);
      play();
    }
    $('referenceReplay').addEventListener('click', play);
    $('referenceStop').addEventListener('click', () => stop());
    function dispose() {
      stop(false);
      if (animation !== null) window.cancelAnimationFrame?.(animation);
      animation = null;
    }
    return Object.freeze({select, stop, dispose});
  }
  window.VowelScopeReference = Object.freeze({vowels, create});
})();
