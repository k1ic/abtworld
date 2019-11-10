/* eslint-disable no-underscore-dangle */
import crypto from 'crypto';

/*
 *strHashType
 *1.md5
 *2.sha1
 */
export function HashString(strHashType, strHashIn){
  const HashObj = crypto.createHash(strHashType);
  if(!HashObj){
    console.log('invalid hash obj');
    return null;
  }
  HashObj.update(strHashIn);
  const strHashOut = HashObj.digest('hex');
  
  //console.log(strHashType+' hash in='+strHashIn+' out='+strHashOut);
  return strHashOut;
}
