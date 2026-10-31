/** Quiet music is opt-in; short varied cues carry most of the feedback. */
export class ForestAudio {
  constructor() { this.context = null; this.music = false; this.timer = null; this.active = false; this.variation = {}; }
  unlock() {
    try { this.context ??= new (window.AudioContext || window.webkitAudioContext)(); this.context.resume(); this.active = true; this.startMusic(); } catch {}
  }
  note(frequency, delay = 0, duration = .15, volume = .05, type = 'sine') {
    const ctx = this.context;
    if (!ctx || !this.active) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), at = ctx.currentTime + delay;
    o.type = type; o.frequency.value = frequency;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(volume, at + .012);
    g.gain.exponentialRampToValueAtTime(.0001, at + duration);
    o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + duration + .02);
  }
  cue(kind) {
    const variation = this.variation[kind] || 0; this.variation[kind] = (variation + 1) % 3;
    const tunes = {
      turn: [[440], [494], [523]],
      up: [[523,659], [587,784], [659,880]],
      back: [[392,330], [440,349], [349,294]],
      wrong: [[220], [247], [262]],
      win: [[523,659,784,1047], [587,740,880,1175], [659,784,988,1319]],
    };
    if (kind === 'roll') {
      [0,.12,.29,.5,.75,.95].forEach((t,i)=>this.note(160-i*12,t,.07,.035,'triangle'));
      return;
    }
    (tunes[kind]?.[variation] || []).forEach((f,i)=>this.note(f,i*.12,kind==='win'?.45:.2,kind==='turn'?.025:.045,'triangle'));
  }
  setMusic(on) { this.music = on; this.stopMusic(); if (on) this.startMusic(); }
  startMusic() {
    if (!this.context || !this.active || !this.music || this.timer !== null) return;
    // Spacious pentatonic phrases, kept much quieter than the dice and cues.
    this.musicGain = this.context.createGain(); this.musicGain.gain.value = .014;
    this.musicGain.connect(this.context.destination);
    const phrase = () => {
      if (!this.active || !this.music) return;
      const notes = [392,0,494,587,0,523,494,0,440,0,392,0];
      notes.forEach((f,i)=>{ if(!f)return; const ctx=this.context,o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.7;
        o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+.04);g.gain.exponentialRampToValueAtTime(.001,t+.6);
        o.connect(g);g.connect(this.musicGain);o.start(t);o.stop(t+.65);
      });
      this.timer = setTimeout(phrase,11200);
    };
    phrase();
  }
  stopMusic() { clearTimeout(this.timer); this.timer=null; this.musicGain?.disconnect(); this.musicGain=null; }
  suspend() { this.active=false; this.stopMusic(); this.context?.suspend(); }
  resume() { if(!this.context)return; this.active=true;this.context.resume();this.startMusic(); }
}
