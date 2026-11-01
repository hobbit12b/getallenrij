const FILES={intro:'assets/audio/music-intro.mp3',loop:'assets/audio/music-loop.mp3',roll:'assets/audio/dice-roll.mp3',up:'assets/audio/acorn-appear.mp3',back:'assets/audio/acorn-disappear.mp3'};

/** Decode once, then schedule intro and looping music on one audio clock. */
export class ForestAudio {
  constructor({contextFactory,fetcher,onMusicState}={}) {
    this.contextFactory=contextFactory||(()=>new (window.AudioContext||window.webkitAudioContext)());
    this.fetcher=fetcher||((url)=>fetch(url));
    this.onMusicState=onMusicState||(()=>{});
    this.context=null;this.active=false;this.music=false;this.variation={};
    this.sources=[];this.rollSource=null;this.generation=0;this.rollGeneration=0;
    this.bytesPromise=null;this.buffersPromise=null;this.buffers=null;this.pendingMusic=null;
  }
  preload() {
    if(!this.bytesPromise)this.bytesPromise=Promise.all(Object.entries(FILES).map(async([key,url])=>{
      const response=await this.fetcher(url);
      if(!response.ok)throw new Error('Audio file unavailable: '+key);
      return [key,await response.arrayBuffer()];
    })).catch(error=>{this.bytesPromise=null;throw error;});
    return this.bytesPromise;
  }
  unlock() {
    try {
      this.context??=this.contextFactory();this.active=true;
      this.context.resume().catch(()=>{});
      this.prepare().catch(()=>{});
      if(this.music&&!this.sources.length)this.startMusic();
    } catch {this.onMusicState('error');}
  }
  prepare() {
    if(!this.context)return Promise.reject(new Error('Audio is not unlocked'));
    if(!this.buffersPromise)this.buffersPromise=this.preload().then(entries=>
      Promise.all(entries.map(async([key,bytes])=>[key,await this.context.decodeAudioData(bytes.slice(0))]))
    ).then(entries=>this.buffers=Object.fromEntries(entries)).catch(error=>{this.buffersPromise=null;throw error;});
    return this.buffersPromise;
  }
  setMusic(on,{restart=false}={}) {
    if(!on){this.music=false;this.stopMusic();return;}
    this.music=true;
    if(restart)this.stopMusic();
    if(this.active)this.startMusic();
  }
  startMusic() {
    if(!this.context||!this.active||!this.music||this.sources.length)return Promise.resolve();
    const generation=this.generation;
    if(this.pendingMusic?.generation===generation)return this.pendingMusic.promise;
    this.onMusicState('loading');
    const promise=this.prepare().then(buffers=>{
      if(generation!==this.generation||!this.music||!this.active||this.sources.length)return;
      const ctx=this.context,at=ctx.currentTime+.025;
      const gain=ctx.createGain();gain.gain.value=.28;gain.connect(ctx.destination);
      const intro=ctx.createBufferSource(),loop=ctx.createBufferSource();
      intro.buffer=buffers.intro;loop.buffer=buffers.loop;loop.loop=true;
      loop.loopStart=0;loop.loopEnd=buffers.loop.duration;
      intro.connect(gain);loop.connect(gain);this.musicGain=gain;this.sources=[intro,loop];
      intro.onended=()=>{if(generation===this.generation&&this.music)this.onMusicState('loop');};
      // Both are scheduled now, not through an ended event or a JS timer.
      intro.start(at,0);loop.start(at+buffers.intro.duration,0);
      this.onMusicState('intro');
    }).catch(()=>{if(generation===this.generation&&this.music)this.onMusicState('error');})
      .finally(()=>{if(this.pendingMusic?.generation===generation)this.pendingMusic=null;});
    this.pendingMusic={generation,promise};return promise;
  }
  stopMusic() {
    this.generation++;this.pendingMusic=null;
    for(const source of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();}
    this.sources=[];this.musicGain?.disconnect();this.musicGain=null;
    this.onMusicState('off');
  }
  async playRoll() {
    const generation=++this.rollGeneration,requestedAt=this.context?.currentTime||0;
    try {
      const buffers=await this.prepare();
      if(!this.active||generation!==this.rollGeneration||this.context.currentTime-requestedAt>1.3)return;
      if(this.rollSource){try{this.rollSource.stop();}catch{}}
      const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain();
      source.buffer=buffers.roll;gain.gain.value=.85;
      source.connect(gain);gain.connect(ctx.destination);this.rollSource=source;
      source.onended=()=>{source.disconnect();gain.disconnect();if(this.rollSource===source)this.rollSource=null;};
      source.start(ctx.currentTime,0);
    } catch {}
  }
  async playEffect(kind) {
    const requestedAt=this.context?.currentTime||0;
    try {
      const buffers=await this.prepare();
      if(!this.active||this.context.currentTime-requestedAt>1)return;
      const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain();
      source.buffer=buffers[kind];gain.gain.value=.8;
      source.connect(gain);gain.connect(ctx.destination);
      source.onended=()=>{source.disconnect();gain.disconnect();};
      source.start(ctx.currentTime,0);
    } catch {}
  }
  note(frequency,delay=0,duration=.15,volume=.05,type='sine') {
    const ctx=this.context;if(!ctx||!this.active)return;
    const o=ctx.createOscillator(),g=ctx.createGain(),at=ctx.currentTime+delay;
    o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(0,at);
    g.gain.linearRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(at+duration+.02);
    o.onended=()=>{o.disconnect();g.disconnect();};
  }
  cue(kind) {
    if(kind==='roll')return this.playRoll();
    if(kind==='up'||kind==='back')return this.playEffect(kind);
    const variation=this.variation[kind]||0;this.variation[kind]=(variation+1)%3;
    const tunes={turn:[[440],[494],[523]],up:[[523,659],[587,784],[659,880]],back:[[392,330],[440,349],[349,294]],wrong:[[220],[247],[262]],win:[[523,659,784,1047],[587,740,880,1175],[659,784,988,1319]]};
    (tunes[kind]?.[variation]||[]).forEach((f,i)=>this.note(f,i*.12,kind==='win'?.45:.2,kind==='turn'?.025:.045,'triangle'));
  }
  suspend(){this.active=false;this.context?.suspend().catch(()=>{});}
  resume(){
    if(!this.context)return;this.active=true;this.context.resume().catch(()=>{});
    if(this.music&&!this.sources.length)this.startMusic();
  }
}
