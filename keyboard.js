export const rows=['ABCDEFG','HIJKLMN','OPQRSTU',"VWXYZ-'"];
export function route(from,to,returnKey=null){
 const special={Space:['V','KEY_DOWN'],Clear:['V','KEY_DOWN','KEY_RIGHT'],Search:['V','KEY_DOWN','KEY_RIGHT','KEY_RIGHT'],Delete:['G','KEY_RIGHT'],'&123':['N','KEY_RIGHT'],Globe:['U','KEY_RIGHT']};
 const known=char=>typeof char==='string'&&(rows.some(row=>row.includes(char)&&char.length===1)||Object.hasOwn(special,char));
 if(!known(from)||!known(to))throw new Error('Unsupported keyboard character');
 if(from===to)return ['KEY_ENTER'];
 const bottom=['Space','Clear','Search'];
 if(bottom.includes(from)&&bottom.includes(to)){const delta=bottom.indexOf(to)-bottom.indexOf(from);return [...Array(Math.abs(delta)).fill(delta>0?'KEY_RIGHT':'KEY_LEFT'),'KEY_ENTER'];}
 if(bottom.includes(to)&&rows.some(row=>row.includes(from))){const row=rows.findIndex(row=>row.includes(from));return [...Array(rows.length-row).fill('KEY_DOWN'),...Array(bottom.indexOf(to)).fill('KEY_RIGHT'),'KEY_ENTER'];}
 if(bottom.includes(from)){if(!rows[3].includes(returnKey)||typeof returnKey!=='string'||returnKey.length!==1)throw new Error('Sync a letter on the TV before leaving the bottom row.');return ['KEY_UP',...route(returnKey,to)];}
 if(Object.hasOwn(special,from)){const [anchor,...moves]=special[from];const reverse={KEY_DOWN:'KEY_UP',KEY_RIGHT:'KEY_LEFT'};return [...moves.slice().reverse().map(move=>reverse[move]),...route(anchor,to)];}
 if(Object.hasOwn(special,to)){const [anchor,...moves]=special[to];return [...route(from,anchor).slice(0,-1),...moves,'KEY_ENTER'];}
 const locate=char=>{const row=rows.findIndex(r=>r.includes(char));if(row<0)throw new Error('Unsupported keyboard character');return [row,rows[row].indexOf(char)];};
 const [r,c]=locate(from),[nr,nc]=locate(to);return [...Array(Math.abs(nr-r)).fill(nr>r?'KEY_DOWN':'KEY_UP'),...Array(Math.abs(nc-c)).fill(nc>c?'KEY_RIGHT':'KEY_LEFT'),'KEY_ENTER'];
}

export function keyboardAction(from,to,returnKey=null){
 const bottom=['Space','Clear','Search'];
 const knownTarget=typeof to==='string'&&(rows.some(row=>to.length===1&&row.includes(to))||['Delete','&123','Globe'].includes(to));
 const knownReturn=typeof returnKey==='string'&&returnKey.length===1&&rows[3].includes(returnKey);
 if(bottom.includes(from)&&knownTarget&&!knownReturn)return {sequence:['KEY_UP'],needsSync:true};
 return {sequence:route(from,to,returnKey),needsSync:false};
}
