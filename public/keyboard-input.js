export function keyboardTarget(event){
 if(event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return null;
 if(/^[a-z]$/i.test(event.key))return event.key.toUpperCase();
 return ({' ':'Space',Backspace:'Delete',Delete:'Delete',Enter:'Search','-':'-',"'":"'"})[event.key]||null;
}
