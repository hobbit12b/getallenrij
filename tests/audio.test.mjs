import test from 'node:test';
import assert from 'node:assert/strict';
import {ForestAudio} from '../audio.mjs';
import {HINT_DELAY} from '../guidance.mjs';

function setup(fetcher) {
  const sources=[],states=[];
  const context={currentTime:10,destination:{},
    resume:async()=>{},suspend:async()=>{},
    decodeAudioData:async bytes=>({duration:new Uint8Array(bytes)[0]}),
    createGain:()=>({gain:{value:0},connect(){},disconnect(){}}),
    createBufferSource:()=>{const source={connect(){},disconnect(){},start(...args){this.started=args;},stop(){this.stopped=true;}};sources.push(source);return source;}
  };
  const audio=new ForestAudio({contextFactory:()=>context,onMusicState:s=>states.push(s),fetcher:fetcher|| (async url=>({ok:true,arrayBuffer:async()=>Uint8Array.of(url.includes('intro')?8:url.includes('loop')?24:url.includes('appear')?2:1).buffer}))});
  audio.unlock();return {audio,context,sources,states};
}
test('intro and repeating loop meet at exactly the same audio-clock boundary',async()=>{
  const {audio,sources,states}=setup();audio.setMusic(true);await audio.startMusic();
  assert.equal(sources.length,2);
  assert.deepEqual(sources[0].started,[10.025,0]);
  assert.deepEqual(sources[1].started,[18.025,0]);
  assert.equal(sources[1].loop,true);assert.equal(sources[1].loopEnd,24);
  sources[0].onended();assert.equal(states.at(-1),'loop');
});
test('stop cancels intro and scheduled loop; enable starts a new intro at offset zero',async()=>{
  const {audio,context,sources}=setup();audio.setMusic(true);await audio.startMusic();
  audio.setMusic(false);assert.ok(sources.every(s=>s.stopped));
  context.currentTime=40;audio.setMusic(true);await audio.startMusic();
  assert.deepEqual(sources[2].started,[40.025,0]);assert.deepEqual(sources[3].started,[48.025,0]);
});
test('turning music off while loading prevents stale playback',async()=>{
  let release;const gate=new Promise(r=>release=r);
  const {audio,sources}=setup(async()=>{await gate;return {ok:true,arrayBuffer:async()=>Uint8Array.of(8).buffer};});
  audio.setMusic(true);const pending=audio.startMusic();audio.setMusic(false);release();await pending;
  assert.equal(sources.length,0);
});
test('visibility pause and repeated unlock preserve the scheduled pair',async()=>{
  const {audio,sources}=setup();audio.setMusic(true);await audio.startMusic();
  audio.suspend();audio.resume();audio.unlock();await audio.startMusic();
  assert.equal(sources.length,2);assert.ok(sources.every(s=>!s.stopped));
});
test('dice and both supplied acorn samples play with background music muted',async()=>{
  const {audio,sources}=setup();await audio.prepare();
  for(const kind of ['roll','up','back'])await audio.cue(kind);
  assert.equal(sources.length,3);
  assert.equal(sources[0].buffer,audio.buffers.roll);
  assert.equal(sources[1].buffer,audio.buffers.up);
  assert.equal(sources[2].buffer,audio.buffers.back);
  assert.ok(sources.every(s=>s.started[1]===0));
});
test('the inactivity hint begins after eight seconds',()=>assert.equal(HINT_DELAY,8000));
