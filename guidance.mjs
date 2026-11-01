export const HINT_DELAY = 8000;
export function showFirstGuide(game) {
  return !(game.mode==='computer' && game.current===1)
    && game.players[game.current].turnsTaken===0
    && ['roll','choose'].includes(game.phase);
}
export function helpWords(game, explicit = true) {
  if(game.phase==='ended') return 'Nog een keer spelen?';
  if(game.mode==='computer' && game.current===1) return 'Egel is aan de beurt.';
  if(game.phase==='roll') return 'Tik op de dobbelsteen.';
  if(game.phase==='choose') return explicit ? `Waar ligt de ${game.rolled}?` : 'Tel de stippen. Kijk naar je rij.';
  return 'Nu is de ander aan de beurt.';
}
