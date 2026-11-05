export const VOICE_FILES={
  "Verzamel zes eikels om te winnen!": "uitleg_01.mp3",
  "Gooi de dobbelsteen. Tik op de kaart met evenveel stippen. Die wordt een eikel.": "uitleg_02.mp3",
  "Ligt er al een eikel? Dan wordt het weer een kaart. Speel om de beurt.": "uitleg_03.mp3",
  "Tik op de dobbelsteen.": "hulp_gooien.mp3",
  "Tel de stippen. Kijk naar je rij.": "hulp_tellen.mp3",
  "Waar ligt de 1?": "zoek_1.mp3",
  "Waar ligt de 2?": "zoek_2.mp3",
  "Waar ligt de 3?": "zoek_3.mp3",
  "Waar ligt de 4?": "zoek_4.mp3",
  "Waar ligt de 5?": "zoek_5.mp3",
  "Waar ligt de 6?": "zoek_6.mp3",
  "Egel is aan de beurt.": "hulp_egel.mp3",
  "Nu is de ander aan de beurt.": "hulp_wisselen.mp3",
  "Nog een keer spelen?": "hulp_opnieuw.mp3",
  "Eekhoorn heeft zes eikels. Egel mag nog één keer!": "laatste_beurt.mp3",
  "Gelijkspel! Gooi allebei. Wie het meeste gooit, wint het spel!": "gelijk_zes.mp3",
  "Evenveel! Gooi allebei nog een keer.": "gelijk_opnieuw.mp3",
  "Gooi de dobbelsteen. Wie het meeste gooit, wint het spel!": "hulp_beslissingsworp.mp3",
  "Eekhoorn heeft gewonnen!": "winnaar_eekhoorn.mp3",
  "Egel heeft gewonnen!": "winnaar_egel.mp3"
};

export class RecordedVoice {
  constructor(getContext,fetcher=fetch){this.getContext=getContext;this.fetcher=fetcher;this.cache=new Map();this.generation=0;this.source=null;}
  stop(){this.generation++;if(this.source){this.source.onended=null;try{this.source.stop();}catch{}this.source.disconnect();this.source=null;}}
  async play(words,{onStart,onEnd,onError}={}){
    this.stop();const token=this.generation;
    try{
      const file=VOICE_FILES[words];if(!file)throw new Error('Unknown voice line');
      const context=this.getContext();if(!context)throw new Error('Audio not unlocked');
      if(!this.cache.has(file))this.cache.set(file,this.fetcher('assets/voice/'+file).then(r=>{if(!r.ok)throw new Error('Voice unavailable');return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).catch(e=>{this.cache.delete(file);throw e;}));
      const buffer=await this.cache.get(file);if(token!==this.generation)return;
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);this.source=source;
      source.onended=()=>{source.disconnect();if(token===this.generation){this.source=null;onEnd?.();}};
      source.start();onStart?.();
    }catch(error){if(token===this.generation)onError?.(error);}
  }
}
