import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RecordedVoice,VOICE_FILES} from '../voice.mjs';
test('all twenty recorded lines exist, including numbered hints',()=>{
 assert.equal(Object.keys(VOICE_FILES).length,20);
 for(const file of Object.values(VOICE_FILES))assert.ok(fs.statSync(new URL('../assets/voice/'+file,import.meta.url)).size>1000);
 for(let n=1;n<=6;n++)assert.equal(VOICE_FILES[`Waar ligt de ${n}?`],`zoek_${n}.mp3`);
});
test('recordings finish on audio completion, and stop cancels callbacks',async()=>{
 const sources=[];let fetched=0,ended=0,started=0;
 const ctx={decodeAudioData:async()=>({duration:18}),destination:{},createBufferSource:()=>{const s={connect(){},disconnect(){},start(){},stop(){}};sources.push(s);return s;}};
 const voice=new RecordedVoice(()=>ctx,async()=>{fetched++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};});
 const words='Tik op de dobbelsteen.';
 await voice.play(words,{onStart:()=>started++,onEnd:()=>ended++});
 assert.equal(started,1);assert.equal(ended,0);sources[0].onended();assert.equal(ended,1);
 await voice.play(words,{onEnd:()=>ended++});voice.stop();assert.equal(sources[1].onended,null);assert.equal(ended,1);assert.equal(fetched,1);
});
test('skipping while a recording downloads cannot start stale audio',async()=>{
 let resolve,starts=0;
 const ctx={decodeAudioData:async()=>({}),destination:{},createBufferSource:()=>({connect(){},start(){starts++;}})};
 const voice=new RecordedVoice(()=>ctx,()=>new Promise(r=>resolve=r));
 const pending=voice.play('Tik op de dobbelsteen.');voice.stop();
 resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});await pending;assert.equal(starts,0);
});
