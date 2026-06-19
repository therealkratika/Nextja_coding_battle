const Battle = require('../model/battle');
const createRandomCode = ()=>{
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890#@&';
    let code = "";
    for(let i=0;i<6;i++){
        code+= chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
const generateUniqueRoomCode = async () => {
  let code;
  let exists = true;
   while (exists) {
    code = createRandomCode();
    const battle = await Battle.findOne({ roomCode: code });
    exists = !!battle; 
  }
 
  return code;
};
 
module.exports = generateUniqueRoomCode;